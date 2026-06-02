"""
Anemia Detection ML Microservice
Uses YOLOv8 to detect and classify Red Blood Cells in peripheral blood smear images.
"""

import base64
import io
import os
import sys
import json
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import numpy as np
import uvicorn

# Try to import ultralytics; fall back to demo mode if not available
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("WARNING: ultralytics not installed. Running in demo mode.", file=sys.stderr)

app = FastAPI(title="Anemia Detection ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# RBC class names (12 classes)
RBC_CLASSES = [
    "Normal",
    "Macrocyte",
    "Microcyte",
    "Spherocyte",
    "Target cell",
    "Stomatocyte",
    "Ovalocyte",
    "Teardrop",
    "Burr cell",
    "Schistocyte",
    "Hypochromia",
    "Elliptocyte",
]

# Anemia-associated abnormal cell classes
ANEMIA_INDICATORS = {
    "Macrocyte",
    "Microcyte",
    "Spherocyte",
    "Target cell",
    "Stomatocyte",
    "Ovalocyte",
    "Teardrop",
    "Burr cell",
    "Schistocyte",
    "Hypochromia",
    "Elliptocyte",
}

# Color palette per class for bounding box drawing (BGR for OpenCV, RGB for PIL)
CLASS_COLORS = {
    "Normal": (34, 197, 94),
    "Macrocyte": (59, 130, 246),
    "Microcyte": (249, 115, 22),
    "Spherocyte": (168, 85, 247),
    "Target cell": (236, 72, 153),
    "Stomatocyte": (20, 184, 166),
    "Ovalocyte": (234, 179, 8),
    "Teardrop": (239, 68, 68),
    "Burr cell": (99, 102, 241),
    "Schistocyte": (236, 254, 255),
    "Hypochromia": (245, 158, 11),
    "Elliptocyte": (16, 185, 129),
}

# Load model once at startup
model = None
MODEL_PATH = os.environ.get("MODEL_PATH", "model_old_backup.pt")


def load_model():
    global model
    if not YOLO_AVAILABLE:
        print("Ultralytics not available, using demo mode", file=sys.stderr)
        return
    if not Path(MODEL_PATH).exists():
        print(f"Model file not found at {MODEL_PATH}. Running in demo mode.", file=sys.stderr)
        return
    try:
        model = YOLO(MODEL_PATH)
        print(f"Model loaded from {MODEL_PATH}", file=sys.stderr)
    except Exception as e:
        print(f"Failed to load model: {e}. Running in demo mode.", file=sys.stderr)


class ClassCount(BaseModel):
    className: str
    count: int
    percentage: float


class PredictionResponse(BaseModel):
    annotatedImageBase64: str
    totalCells: int
    classCounts: list[ClassCount]
    confidence: float


def generate_demo_prediction(image: Image.Image) -> PredictionResponse:
    """Generate realistic demo predictions when model is not available."""
    import random

    rng = random.Random(42)

    # Generate realistic-looking RBC distribution
    total_cells = rng.randint(80, 200)

    # Weighted random distribution biased toward Normal cells
    weights = [60, 5, 8, 4, 4, 2, 4, 2, 2, 2, 5, 2]  # matches RBC_CLASSES order
    raw_counts = [max(0, int(rng.gauss(w, w * 0.3))) for w in weights]

    # Scale to total_cells
    raw_total = sum(raw_counts)
    if raw_total == 0:
        raw_counts[0] = total_cells
        raw_total = total_cells

    counts = [int(c * total_cells / raw_total) for c in raw_counts]
    # Fix rounding
    diff = total_cells - sum(counts)
    counts[0] += diff

    class_counts = []
    for i, cls in enumerate(RBC_CLASSES):
        pct = round((counts[i] / total_cells) * 100, 1) if total_cells > 0 else 0
        class_counts.append(ClassCount(className=cls, count=counts[i], percentage=pct))

    # Draw bounding boxes on the image using PIL
    from PIL import ImageDraw, ImageFont
    annotated = image.copy().convert("RGB")
    draw = ImageDraw.Draw(annotated)

    for i in range(min(total_cells, 50)):  # draw up to 50 boxes for demo
        w, h = annotated.size
        # Random bounding box
        cx = rng.randint(20, w - 20)
        cy = rng.randint(20, h - 20)
        bw = rng.randint(15, 35)
        bh = rng.randint(15, 35)
        x1, y1 = max(0, cx - bw), max(0, cy - bh)
        x2, y2 = min(w, cx + bw), min(h, cy + bh)

        # Pick class by weighted random
        cumulative = 0
        picked_cls = RBC_CLASSES[0]
        r = rng.random() * total_cells
        for j, cls in enumerate(RBC_CLASSES):
            cumulative += counts[j]
            if r <= cumulative:
                picked_cls = cls
                break

        color = CLASS_COLORS.get(picked_cls, (255, 255, 255))
        draw.rectangle([x1, y1, x2, y2], outline=color, width=2)
        draw.text((x1, max(0, y1 - 12)), picked_cls[:3], fill=color)

    # Encode annotated image to base64
    buffer = io.BytesIO()
    annotated.save(buffer, format="JPEG", quality=85)
    img_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return PredictionResponse(
        annotatedImageBase64=img_b64,
        totalCells=total_cells,
        classCounts=class_counts,
        confidence=round(rng.uniform(0.72, 0.96), 2),
    )


def run_yolo_prediction(image: Image.Image) -> PredictionResponse:
    """Run actual YOLOv8 inference on the image."""
    from PIL import ImageDraw
    import cv2

    results = model(image, verbose=False)
    result = results[0]

    class_counts_dict: dict[str, int] = {cls: 0 for cls in RBC_CLASSES}
    confidences = []

    annotated = image.copy().convert("RGB")
    draw = ImageDraw.Draw(annotated)

    if result.boxes is not None:
        for box in result.boxes:
            cls_idx = int(box.cls[0])
            conf = float(box.conf[0])
            confidences.append(conf)

            if cls_idx < len(RBC_CLASSES):
                cls_name = RBC_CLASSES[cls_idx]
                class_counts_dict[cls_name] += 1

                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
                color = CLASS_COLORS.get(cls_name, (255, 255, 255))
                draw.rectangle([x1, y1, x2, y2], outline=color, width=2)
                draw.text((x1, max(0, y1 - 12)), cls_name[:3], fill=color)

    total_cells = sum(class_counts_dict.values())
    avg_confidence = round(float(np.mean(confidences)), 2) if confidences else 0.0

    class_counts = []
    for cls in RBC_CLASSES:
        count = class_counts_dict[cls]
        pct = round((count / total_cells) * 100, 1) if total_cells > 0 else 0.0
        class_counts.append(ClassCount(className=cls, count=count, percentage=pct))

    buffer = io.BytesIO()
    annotated.save(buffer, format="JPEG", quality=85)
    img_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return PredictionResponse(
        annotatedImageBase64=img_b64,
        totalCells=total_cells,
        classCounts=class_counts,
        confidence=avg_confidence,
    )


@app.on_event("startup")
async def startup_event():
    load_model()


@app.get("/healthz")
def health_check():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "demo_mode": model is None,
    }


@app.post("/predict", response_model=PredictionResponse)
async def infer(image: UploadFile = File(...)):
    """Run inference on an uploaded blood smear image."""
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    try:
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not open image: {str(e)}")

    try:
        if model is not None:
            return run_yolo_prediction(pil_image)
        else:
            return generate_demo_prediction(pil_image)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")


if __name__ == "__main__":
    port = int(os.environ.get("ML_PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")

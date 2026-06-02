# Anemia-Detection-Website

## Running the Project

### Frontend

Start the frontend development server:

```bash
cd ~/Desktop/anemia\ detection\ website
pnpm --filter anemia-detection dev
```

### Backend

Start the ML service backend:

```bash
cd ~/Desktop/anemia\ detection\ website/artifacts/ml-service
uvicorn main:app --reload --port 8001
```
import { useState, useMemo } from "react";
import { usePredictAnemia } from "@workspace/api-client-react";
import type { PredictionResult } from "@workspace/api-client-react";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, RefreshCw, CheckCircle2, ChevronRight, Activity, Zap } from "lucide-react";

export default function Dashboard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const hasAnemia = useMemo(() => {
    if (!result) return false;

    const abnormal = result.classCounts
      .filter(c => c.className !== "Normal")
      .reduce((sum, c) => sum + c.count, 0);

    return abnormal > result.totalCells * 0.2; // 20% threshold
  }, [result]);


const anemiaReasons = useMemo(() => {
  if (!result) return [];

  return result.classCounts
    .filter(c => c.className !== "Normal" && c.count > 0)
    .map(c => {
      switch (c.className) {
        case "Microcyte":
          return "Iron deficiency anemia (Microcytes detected)";
        case "Macrocyte":
          return "Vitamin B12/Folate deficiency (Macrocytes detected)";
        case "Spherocyte":
          return "Possible hemolytic anemia (Spherocytes detected)";
        case "Target cell":
          return "Possible liver disease or thalassemia (Target cells)";
        case "Schistocyte":
          return "RBC fragmentation (Schistocytes detected)";
        case "Hypochromia":
          return "Low hemoglobin (Hypochromia)";
        case "Elliptocyte":
        case "Ovalocyte":
          return "Possible hereditary elliptocytosis";
        default:
          return `${c.className} abnormality detected`;
      }
    });
}, [result]);



  const predictMutation = usePredictAnemia();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
  };

  const handleAnalyze = () => {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append("image", selectedFile);
    
    predictMutation.mutate(
      { data: { image: selectedFile } },
      {
        onSuccess: (data) => {
          setResult(data);
        },
      }
    );
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    predictMutation.reset();
  };

  // Status computation
  const isAnalyzing = predictMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Analysis Dashboard</h1>
        <p className="text-muted-foreground">Upload peripheral blood smear images for YOLOv8 RBC classification.</p>
      </div>

      {!selectedFile && !result && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <FileUpload onFileSelect={handleFileSelect} disabled={isAnalyzing} />
          </CardContent>
        </Card>
      )}

      {selectedFile && !result && (
        <Card>
          <CardHeader>
            <CardTitle>Image Preview</CardTitle>
            <CardDescription>Review the image before running the analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="rounded-lg overflow-hidden border bg-muted aspect-video relative flex items-center justify-center">
                {previewUrl && <img src={previewUrl} alt="Preview" className="max-h-full object-contain" />}
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-medium">Selected File</h3>
                  <p className="text-sm font-mono text-muted-foreground bg-muted p-2 rounded">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                
                <div className="flex gap-4">
                  <Button 
                    onClick={handleAnalyze} 
                    className="flex-1"
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Run Inference
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleReset} disabled={isAnalyzing}>
                    Cancel
                  </Button>
                </div>
                
                {isAnalyzing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Processing via YOLOv8...</span>
                    </div>
                    <Progress value={45} className="h-2 animate-pulse" />
                  </div>
                )}
                
                {predictMutation.isError && (
                  <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 mt-0.5" />
                    <div>
                      <p className="font-medium">Analysis Failed</p>
                      <p className="text-sm opacity-90">An error occurred during inference. Please try again.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">Results</h2>
              <Badge variant={hasAnemia ? "destructive" : "default"}>
                {hasAnemia ? "ANEMIA POSITIVE" : "NORMAL"}
              </Badge>
            </div>
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              New Analysis
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Images side by side */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Original Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md overflow-hidden border bg-black aspect-square relative">
                  {previewUrl && <img src={previewUrl} alt="Original" className="w-full h-full object-contain" />}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-primary">Annotated Inference</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md overflow-hidden border bg-black aspect-square relative">
                  <img 
                    src={`data:image/jpeg;base64,${result.annotatedImageBase64}`} 
                    alt="Annotated Results" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>RBC Class Breakdown</CardTitle>
                <CardDescription>Detailed classification of {result.totalCells} detected cells</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right w-24">Count</TableHead>
                      <TableHead className="text-right w-24">%</TableHead>
                      <TableHead className="w-1/3">Distribution</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.classCounts.map((cls) => (
                      <TableRow key={cls.className}>
                        <TableCell className="font-medium">{cls.className}</TableCell>
                        <TableCell className="text-right font-mono">{cls.count}</TableCell>
                        <TableCell className="text-right font-mono">{cls.percentage.toFixed(1)}%</TableCell>
                        <TableCell>
                          <Progress 
                            value={cls.percentage} 
                            className={`h-2 ${cls.className === 'Normal' ? '[&>div]:bg-green-500' : '[&>div]:bg-primary'}`} 
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Cells Detected</p>
                    <p className="text-3xl font-mono font-semibold">{result.totalCells}</p>
                  </div>
                  {/* <div>
                    <p className="text-sm text-muted-foreground mb-1">Model Confidence</p>
                    <div className="flex items-center gap-3">
                      <p className="text-2xl font-mono">{(result.confidence * 100).toFixed(1)}%</p>
                      <Progress value={result.confidence * 100} className="flex-1 h-2" />
                    </div>
                  </div> */}
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Diagnostic Indicator</p>
                    {hasAnemia ? (
                      <div className="flex items-start gap-2 text-destructive">
                        <AlertCircle className="h-5 w-5 mt-0.5" />
                        <span className="font-medium text-sm">Abnormal RBC distribution detected. Review recommended.</span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5 mt-0.5" />
                        <span className="font-medium text-sm">Cell distribution within normal parameters.</span>
                      </div>
                    )}
                  </div>
                  {hasAnemia && anemiaReasons.length > 0 && (
                  <div className="pt-2 space-y-1">
                    <p className="text-sm font-medium">Possible Causes:</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {anemiaReasons.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

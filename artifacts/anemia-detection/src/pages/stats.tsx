import { useGetPredictionStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Microscope, AlertTriangle, Crosshair } from "lucide-react";

export default function StatsPage() {
  const { data: stats, isLoading, isError } = useGetPredictionStats();

  if (isError) {
    return (
      <div className="flex items-center justify-center py-20 text-destructive">
        Failed to load statistics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Aggregate Statistics</h1>
        <p className="text-muted-foreground">System-wide metrics and performance tracking.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20 mt-1" /> : (
              <>
                <div className="text-3xl font-bold font-mono">{stats?.totalPredictions}</div>
                <p className="text-xs text-muted-foreground mt-1">Processed smears</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Cells Counted</CardTitle>
            <Microscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20 mt-1" /> : (
              <>
                <div className="text-3xl font-bold font-mono">{(stats?.totalCellsAnalyzed || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Total RBCs classified</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Positive Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20 mt-1" /> : (
              <>
                <div className="text-3xl font-bold font-mono text-destructive">
                  {stats?.totalPredictions 
                    ? ((stats.anemiaPositiveCount / stats.totalPredictions) * 100).toFixed(1) 
                    : "0.0"}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.anemiaPositiveCount} abnormal cases
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Crosshair className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20 mt-1" /> : (
              <>
                <div className="text-3xl font-bold font-mono">
                  {((stats?.averageConfidence || 0) * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Model accuracy baseline</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Clinical Overview</CardTitle>
          <CardDescription>Primary indicators from aggregate patient data</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="bg-muted rounded-lg p-6">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Most Common Abnormality</h4>
              <p className="text-2xl font-semibold">
                {stats?.mostCommonAbnormality || "None detected"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

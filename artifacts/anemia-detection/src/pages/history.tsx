import { useGetPredictionHistory } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, AlertCircle } from "lucide-react";

export default function HistoryPage() {
  const { data: history, isLoading, isError } = useGetPredictionHistory();

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Failed to load history</h2>
        <p className="text-muted-foreground">Please check your connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Prediction History</h1>
        <p className="text-muted-foreground">Recent analyses and diagnostic results.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
          <CardDescription>Showing the latest peripheral blood smear analyses.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Scan ID</TableHead>
                  <TableHead className="text-right">Total Cells</TableHead>
                  <TableHead className="text-right">Normal %</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                  <TableHead className="text-right">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history?.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {format(new Date(entry.processedAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      #{entry.id.toString().padStart(5, '0')}
                    </TableCell>
                    <TableCell className="text-right font-mono">{entry.totalCells}</TableCell>
                    <TableCell className="text-right font-mono">
                      {entry.normalPercentage.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {(entry.confidence * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={entry.hasAnemia ? "destructive" : "secondary"}>
                        {entry.hasAnemia ? "POSITIVE" : "NORMAL"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {history?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No prediction history available yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

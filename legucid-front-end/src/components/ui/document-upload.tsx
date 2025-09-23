import React, { useState, useCallback } from "react";
import { Upload, FileText, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { useDocumentAnalysis } from "@/contexts/DocumentAnalysisContext";
import { usePageTransition } from "@/contexts/PageTransitionContext";
import { usePageTransitionNavigation } from "@/hooks/use-page-transition";
import { DocumentAnalysisData } from "@/types/documentAnalysis";
import { motion } from "framer-motion";

interface DocumentUploadProps {
  onUpload?: (file: File) => void;
  className?: string;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUpload,
  className,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const { setAnalysisData, setIsLoading } = useDocumentAnalysis();
  const { startTransition, endTransition } = usePageTransition();
  const { navigateWithTransition } = usePageTransitionNavigation();

  // Helper function to calculate time saved based on pages and clauses
  const calculateTimeSaved = useCallback(
    (pages: number, clauses: number): string => {
      // S = (pages × 2) + (clauses × 1.5)
      const S = pages * 2 + clauses * 1.5;

      // Time Saved (hours) = 1 + S / (S + 50)
      const timeSavedHours = 1 + S / (S + 50);

      // Convert to hours and minutes
      const hours = Math.floor(timeSavedHours);
      const minutes = Math.round((timeSavedHours - hours) * 60);

      return `${hours} hr ${minutes} min`;
    },
    []
  );

  // Helper function to process backend response into our data format
  const processResponseData = useCallback(
    (
      responseData: Record<string, unknown>,
      file: File
    ): DocumentAnalysisData => {
      console.log("Processing response data:", responseData);

      // Extract data from your backend response structure
      const riskAssessment =
        (responseData.risk_assessment as Record<string, unknown>) || {};
      const riskSummary =
        (responseData.risk_summary as Record<string, unknown>) || {};

      console.log("Risk assessment from backend:", riskAssessment);
      console.log("Risk summary from backend:", riskSummary);

      // Get the actual counts from your backend
      const highRiskClauses = (riskSummary.high_risk_clauses as number) || 0;
      const mediumRiskClauses =
        (riskSummary.medium_risk_clauses as number) || 0;
      const lowRiskClauses = (riskSummary.low_risk_clauses as number) || 0;
      const totalClauses = (riskSummary.total_clauses_assessed as number) || 0;

      console.log(
        `Risk counts - High: ${highRiskClauses}, Medium: ${mediumRiskClauses}, Low: ${lowRiskClauses}, Total: ${totalClauses}`
      );

      // Get clause assessments from your backend
      const clauseAssessments =
        (riskAssessment.clause_assessments as Array<Record<string, unknown>>) ||
        [];
      const clauseSummaries =
        (riskSummary.clause_summaries as Array<Record<string, unknown>>) || [];

      // Convert to our RiskData format
      const riskData = [];

      // Process high risk items
      if (highRiskClauses > 0) {
        const highRiskClausesList = clauseAssessments.filter(
          (clause) => clause.risk_level === "high"
        );
        riskData.push({
          name: "High",
          value: highRiskClausesList.length,
          color: "#ef4444",
          impacts: highRiskClausesList.map((clause, index) => ({
            id: `high-${index}`,
            name: `Clause ${index + 1}`,
            description:
              (clause.reasoning as string) || "High risk clause identified",
            risk: "high" as const,
          })),
        });
      }

      // Process medium risk items
      if (mediumRiskClauses > 0) {
        const mediumRiskClausesList = clauseAssessments.filter(
          (clause) => clause.risk_level === "medium"
        );
        riskData.push({
          name: "Medium",
          value: mediumRiskClausesList.length,
          color: "#eab308",
          impacts: mediumRiskClausesList.map((clause, index) => ({
            id: `medium-${index}`,
            name: `Clause ${index + 1}`,
            description:
              (clause.reasoning as string) || "Medium risk clause identified",
            risk: "medium" as const,
          })),
        });
      }

      // Process low risk items
      if (lowRiskClauses > 0) {
        const lowRiskClausesList = clauseAssessments.filter(
          (clause) => clause.risk_level === "low"
        );
        riskData.push({
          name: "Low",
          value: lowRiskClausesList.length,
          color: "#22c55e",
          impacts: lowRiskClausesList.map((clause, index) => ({
            id: `low-${index}`,
            name: `Clause ${index + 1}`,
            description:
              (clause.reasoning as string) || "Low risk clause identified",
            risk: "low" as const,
          })),
        });
      }

      console.log("Processed risk data:", riskData);

      // Calculate totals using your backend data
      const flaggedClauses = highRiskClauses + mediumRiskClauses;

      console.log("=== FLAGGED CLAUSES CALCULATION ===");
      console.log(`High risk clauses: ${highRiskClauses}`);
      console.log(`Medium risk clauses: ${mediumRiskClauses}`);
      console.log(`Flagged clauses (high + medium): ${flaggedClauses}`);

      // Extract GCS URI from response
      const gcsUri = (responseData.gcs_uri as string) || "";
      console.log("Extracted GCS URI:", gcsUri);

      // Get page count from backend or use a default
      const pageCount = (responseData.page_count as number) || 24;

      // Calculate time saved using the dynamic function
      const timeSaved = calculateTimeSaved(pageCount, totalClauses);

      console.log("=== TIME SAVED CALCULATION ===");
      console.log(`Page count: ${pageCount}`);
      console.log(`Total clauses: ${totalClauses}`);
      console.log(`Calculated time saved: ${timeSaved}`);

      const processedData = {
        document_name: (riskAssessment.document_name as string) || file.name,
        total_clauses: totalClauses,
        flagged_clauses: flaggedClauses,
        time_saved: timeSaved, // Now calculated dynamically
        risk_assessment: {
          ...riskAssessment, // Preserve all original risk assessment data including clause_assessments
          gcs_uri: gcsUri, // Store GCS URI for audio analysis
          high: riskData.find((item) => item.name === "High")?.impacts || [],
          medium:
            riskData.find((item) => item.name === "Medium")?.impacts || [],
          low: riskData.find((item) => item.name === "Low")?.impacts || [],
        },
        risk_data: riskData,
        upload_time: new Date().toLocaleString(),
        page_count: pageCount, // Now using actual page count from backend
      };

      console.log("Final processed data:", processedData);
      return processedData;
    },
    [calculateTimeSaved]
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploadStatus("uploading");
      setIsLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/upload-document/`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (response.ok) {
          const responseData = await response.json();
          console.log("=== FULL BACKEND RESPONSE ===");
          console.log(JSON.stringify(responseData, null, 2));
          console.log("=== END BACKEND RESPONSE ===");

          // Extract and log the risk_assessment object
          if (responseData && responseData.risk_assessment) {
            console.log("RISK ASSESSMENT: ", responseData.risk_assessment);
          }

          // Process the response data and convert it to our format
          const processedData = processResponseData(responseData, file);
          console.log("=== PROCESSED DATA FOR FRONTEND ===");
          console.log(JSON.stringify(processedData, null, 2));
          console.log("=== END PROCESSED DATA ===");
          console.log("=== STORING DATA IN CONTEXT ===");
          setAnalysisData(processedData);
          console.log("=== DATA STORED IN CONTEXT ===");

          setUploadStatus("success");
          onUpload?.(file);

          // Reset the file input after successful upload
          const fileInput = document.getElementById(
            "file-input"
          ) as HTMLInputElement;
          if (fileInput) fileInput.value = "";

          // Navigate to dashboard with transition after a short delay
          setTimeout(() => {
            setUploadStatus("idle");
            navigateWithTransition("/dashboard", "Processing Document...");
          }, 1500);
        } else {
          setUploadStatus("error");
          // Reset the file input after error
          const fileInput = document.getElementById(
            "file-input"
          ) as HTMLInputElement;
          if (fileInput) fileInput.value = "";
        }
      } catch (err) {
        console.error("Upload failed:", err);
        setUploadStatus("error");
        // Reset the file input after error
        const fileInput = document.getElementById(
          "file-input"
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } finally {
        setIsLoading(false);
      }
    },
    [
      onUpload,
      setAnalysisData,
      setIsLoading,
      navigateWithTransition,
      processResponseData,
    ]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const file = files[0];
        if (file.type === "application/pdf") {
          handleFileUpload(file);
        } else {
          setUploadStatus("error");
          setTimeout(() => setUploadStatus("idle"), 2000);
        }
      }
    },
    [handleFileUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type === "application/pdf") {
          handleFileUpload(file);
        } else {
          setUploadStatus("error");
          // Reset the input value to allow selecting the same file again
          e.target.value = "";
          setTimeout(() => setUploadStatus("idle"), 2000);
        }
      }
    },
    [handleFileUpload]
  );

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case "uploading":
        return (
          <motion.div
            className="relative w-16 h-16"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </motion.div>
        );
      case "success":
        return (
          <motion.div
            className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <Check className="h-8 w-8 text-white" />
          </motion.div>
        );
      case "error":
        return (
          <motion.div
            className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <AlertCircle className="h-8 w-8 text-white" />
          </motion.div>
        );
      default:
        return (
          <motion.div
            className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Upload className="h-8 w-8 text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300" />
          </motion.div>
        );
    }
  };

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case "uploading":
        return "Processing document...";
      case "success":
        return "Document uploaded successfully!";
      case "error":
        return "Upload failed. Please try again.";
      default:
        return "Drag and drop your PDF here, or click to browse";
    }
  };

  const getProcessingTimeMessage = () => {
    switch (uploadStatus) {
      case "uploading":
        return "This usually takes 30 seconds to 1 minute";
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case "uploading":
        return "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 shadow-lg";
      case "success":
        return "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 shadow-lg";
      case "error":
        return "border-red-200 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 shadow-lg";
      default:
        return "border-dashed border-2 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-950/20 dark:hover:to-indigo-950/20";
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <motion.div
        className={cn(
          "relative rounded-3xl border-2 transition-all duration-500 cursor-pointer group overflow-hidden",
          getStatusColor(),
          uploadStatus === "idle" &&
            "hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() =>
          uploadStatus === "idle" &&
          document.getElementById("file-input")?.click()
        }
        whileHover={uploadStatus === "idle" ? { scale: 1.02, y: -4 } : {}}
        whileTap={uploadStatus === "idle" ? { scale: 0.98 } : {}}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Animated background gradient */}
        {uploadStatus === "idle" && (
          <motion.div
            className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            animate={{
              background: [
                "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1), rgba(236, 72, 153, 0.1))",
                "linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))",
                "linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(236, 72, 153, 0.1), rgba(59, 130, 246, 0.1))",
                "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1), rgba(236, 72, 153, 0.1))",
              ],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}

        {/* Floating particles effect */}
        {uploadStatus === "idle" && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-blue-400/30 rounded-full"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 3) * 20}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0.3, 0.8, 0.3],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        )}

        <div className="relative p-16 text-center">
          <motion.div
            className="flex justify-center mb-8"
            animate={uploadStatus === "uploading" ? { rotate: 360 } : {}}
            transition={{
              duration: 2,
              repeat: uploadStatus === "uploading" ? Infinity : 0,
              ease: "linear",
            }}
          >
            {getStatusIcon()}
          </motion.div>

          <motion.h3
            className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300"
            animate={uploadStatus === "success" ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.6 }}
          >
            {getStatusMessage()}
          </motion.h3>

          {uploadStatus === "uploading" && (
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <p className="text-blue-600 dark:text-blue-400 text-lg font-medium mb-2">
                {getProcessingTimeMessage()}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-blue-500 dark:text-blue-400">
                <motion.div
                  className="w-2 h-2 bg-blue-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span>Please wait while we analyze your document</span>
                <motion.div
                  className="w-2 h-2 bg-blue-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                />
              </div>
            </motion.div>
          )}

          {uploadStatus === "idle" && (
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Supports PDF files up to 10MB
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-500">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span>Secure • Fast • Reliable</span>
                <div
                  className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                  style={{ animationDelay: "0.5s" }}
                ></div>
              </div>
            </motion.div>
          )}

          {uploadStatus === "success" && (
            <motion.div
              className="mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <div className="flex items-center justify-center gap-3 text-lg text-green-600 dark:text-green-400 font-medium">
                <FileText className="h-5 w-5" />
                <span>Redirecting to analysis...</span>
                <motion.div
                  className="flex gap-1"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                  <div
                    className="w-1 h-1 bg-green-500 rounded-full"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-1 h-1 bg-green-500 rounded-full"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {uploadStatus === "error" && (
            <motion.div
              className="mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <p className="text-red-600 dark:text-red-400 text-sm">
                Please try uploading a valid PDF file
              </p>
            </motion.div>
          )}
        </div>

        {/* Bottom accent line */}
        {uploadStatus === "idle" && (
          <motion.div
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full group-hover:w-32 transition-all duration-500"
            initial={{ width: 0 }}
            whileHover={{ width: 128 }}
          />
        )}
      </motion.div>
    </div>
  );
};

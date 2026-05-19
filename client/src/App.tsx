import { BarChart3, GraduationCap, CheckCircle, Upload, Database, FileText } from "lucide-react";
import Header from "./components/Header";
import StatCard from "./components/StatCard";
import TabBtn from "./components/TabBtn";
import UploadPage from "./pages/UploadPage";
import GeneratePage from "./pages/GeneratePage";
import QuizPage from "./pages/QuizPage";
import QuizComplete from "./pages/QuizComplete";
import { useQuiz } from "./hooks/useQuiz";

export default function App() {
  const {
    studentId,
    activeTab,
    setActiveTab,
    ingestedSources,
    quizQuestions,
    currentQuizIndex,
    quizFinished,
    lastFeedback,
    loading,
    studentStats,
    handleFileUpload,
    handleGenerateQuiz,
    handleSubmitAnswer,
    resetQuiz,
  } = useQuiz();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-4 md:p-8 font-sans transition-colors">
      <div className="max-w-4xl mx-auto">
        <Header studentId={studentId} />

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard icon={<BarChart3 />} label="Accuracy" value={`${studentStats.accuracy}%`} color="indigo" />
          <StatCard icon={<GraduationCap />} label="Level" value={studentStats.difficulty} color="amber" />
          <StatCard icon={<CheckCircle />} label="Solved" value={studentStats.total} color="emerald" />
        </div>

        {/* Main Content Card */}
        <div className="bg-[var(--card)] rounded-[2rem] shadow-xl shadow-slate-200/60 border border-[var(--card-border)] overflow-hidden min-h-[500px] transition-colors">
          <nav className="flex bg-[var(--nav)] border-b border-[var(--nav-border)]">
            <TabBtn active={activeTab === "upload"} label="Ingest" icon={<Upload />} onClick={() => setActiveTab("upload")} />
            <TabBtn active={activeTab === "generate"} label="Generate" icon={<Database />} onClick={() => setActiveTab("generate")} />
            <TabBtn
              active={activeTab === "quiz"}
              label="Quiz"
              icon={<FileText />}
              onClick={() => setActiveTab("quiz")}
              disabled={quizQuestions.length === 0}
            />
          </nav>

          <div className="p-8">
            {activeTab === "upload" && (
              <UploadPage
                loading={loading.ingest}
                ingestedSources={ingestedSources}
                onFileUpload={handleFileUpload}
                onGenerate={handleGenerateQuiz}
              />
            )}

            {activeTab === "generate" && (
              <GeneratePage
                loading={loading.generate}
                difficulty={studentStats.difficulty}
                topic={ingestedSources[0]?.topic || "General"}
                firstSourceId={ingestedSources[0]?.id}
                onGenerate={handleGenerateQuiz}
              />
            )}

            {activeTab === "quiz" && !quizFinished && (
              <QuizPage
                questions={quizQuestions}
                currentIndex={currentQuizIndex}
                feedback={lastFeedback}
                onSubmitAnswer={handleSubmitAnswer}
              />
            )}

            {quizFinished && <QuizComplete accuracy={studentStats.accuracy} onDone={resetQuiz} />}
          </div>
        </div>
      </div>
    </div>
  );
}

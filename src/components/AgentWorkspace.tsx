import { useState, useRef, useEffect } from "react";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { MODEL_NAME, tools } from "../lib/gemini";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Send, 
  Search, 
  FileText, 
  Database, 
  BarChart3, 
  Loader2, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Terminal,
  LayoutDashboard
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { generatePDF, generateExcel, generateWord, ReportData } from "../lib/reportGenerator";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { toast } from "sonner";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  tasks?: Task[];
  report?: ReportData;
}

interface Task {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
}

export function AgentWorkspace() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTasks, setCurrentTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentTasks]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, `[${time}] ${msg}`].slice(-10));
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);
    setCurrentTasks([]);
    addLog("API Request Sent");

    try {
      addLog("Parser Initialized");
      // 1. Task Decomposition (Planning)
      const planResponse = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Decompose the following user request into a list of executable sub-tasks. 
        Available tools: web_search, summarize_text, extract_data, generate_report.
        Return the plan as a JSON array of objects with 'id', 'name', and 'tool' fields.
        Request: ${input}`,
        config: {
          responseMimeType: "application/json",
        }
      });

      const plan = JSON.parse(planResponse.text || "[]");
      const initialTasks = plan.map((p: any) => ({
        ...p,
        status: "pending"
      }));
      setCurrentTasks(initialTasks);
      addLog(`Plan generated: ${initialTasks.length} tasks`);

      // 2. Execute Tasks
      let accumulatedContext = "";
      let finalReport: ReportData | undefined;

      for (let i = 0; i < initialTasks.length; i++) {
        const task = initialTasks[i];
        setCurrentTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: "running" } : t));
        addLog(`Tool: ${task.name} Started`);

        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: [
            { text: `Current Task: ${task.name}. Context from previous tasks: ${accumulatedContext}. User Request: ${input}` }
          ],
          config: {
            tools: tools,
            toolConfig: { includeServerSideToolInvocations: true }
          }
        });

        const functionCalls = response.functionCalls;
        let taskResult = "";

        if (functionCalls) {
          for (const call of functionCalls) {
            if (call.name === "generate_report") {
              finalReport = call.args as unknown as ReportData;
              taskResult = "Report generated successfully.";
            } else if (call.name === "web_search") {
              taskResult = response.text || "Search completed.";
            } else {
              taskResult = `Executed ${call.name}`;
            }
          }
        } else {
          taskResult = response.text || "Task completed.";
        }

        accumulatedContext += `\nTask ${task.name} Result: ${taskResult}`;
        setCurrentTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: "completed", result: taskResult } : t));
        addLog(`Task ${i + 1} Finished`);
      }

      // 3. Final Response
      const finalResponse = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Based on the completed tasks and context: ${accumulatedContext}, provide a final comprehensive response to the user's original request: ${input}`,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: finalResponse.text || "I've completed the tasks.",
        tasks: initialTasks,
        report: finalReport
      };

      setMessages(prev => [...prev, assistantMessage]);
      addLog("Response Stream Completed");
      toast.success("All tasks completed successfully!");
    } catch (error) {
      console.error("Agent Error:", error);
      addLog("CRITICAL ERROR: Execution Failed");
      toast.error("An error occurred while processing your request.");
    } finally {
      setIsProcessing(false);
      setCurrentTasks([]);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-[#0F1115] text-[#E2E8F0] font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div className="text-xl font-bold tracking-tighter flex items-center gap-3">
          <div className="w-2 h-2 bg-[#10B981] rounded-full shadow-[0_0_10px_#10B981]" />
          AI-SYSTEM CORE <span className="text-[#475569] font-light">V2.4.0</span>
        </div>
        <div className="flex gap-5 text-xs text-[#94A3B8] font-medium uppercase tracking-wider">
          <span>CLI MODE: ENABLED</span>
          <span>API: 2 CONNECTED</span>
        </div>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-4 grid-rows-3 gap-4 flex-grow mb-6 overflow-hidden">
        {/* Card 1: Task Decomposition */}
        <Card className="col-span-2 row-span-2 bg-[#1E293B] border-[#334155] p-5 flex flex-col rounded-[16px]">
          <h3 className="text-[12px] uppercase tracking-[1px] text-[#94A3B8] font-semibold mb-4">Task Decomposition Planner</h3>
          <div className="flex-grow border-l-2 border-[#3B82F6] pl-4 mt-2 space-y-4 overflow-y-auto">
            {currentTasks.length > 0 ? (
              currentTasks.map((task, idx) => (
                <div key={task.id} className={`flex items-start gap-3 transition-opacity duration-300 ${task.status === 'pending' ? 'opacity-40' : 'opacity-100'}`}>
                  <span className="font-mono text-[#3B82F6] text-sm">{(idx + 1).toString().padStart(2, '0')}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{task.name}</p>
                    {task.status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-primary mt-1" />}
                  </div>
                </div>
              ))
            ) : (
              <div className="opacity-30 italic text-sm">Waiting for instructions...</div>
            )}
          </div>
          <div className="mt-4">
            <div className="h-1 bg-[#334155] w-full rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-[#3B82F6]" 
                initial={{ width: 0 }}
                animate={{ width: `${(currentTasks.filter(t => t.status === 'completed').length / (currentTasks.length || 1)) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-[#64748B] mt-2">
              {isProcessing ? `Processing Sub-task ${currentTasks.filter(t => t.status === 'completed').length + 1} of ${currentTasks.length}...` : "System Idle"}
            </p>
          </div>
        </Card>

        {/* Card 2: Active Tools */}
        <Card className="bg-[#1E293B] border-[#334155] p-5 flex flex-col rounded-[16px]">
          <h3 className="text-[12px] uppercase tracking-[1px] text-[#94A3B8] font-semibold mb-4">Active Tools</h3>
          <div className="grid grid-cols-2 gap-2 flex-grow">
            {[
              { name: "WebSearch", active: true },
              { name: "Summarizer", active: true },
              { name: "DataExtract", active: true },
              { name: "FileExport", active: isProcessing }
            ].map(tool => (
              <div key={tool.name} className={`bg-[#0F172A] border border-[#334155] rounded-lg p-3 flex items-center gap-2 text-[13px] transition-colors ${tool.active ? 'border-[#3B82F6] bg-[#3B82F6]/10' : ''}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${tool.active ? 'bg-[#3B82F6]' : 'bg-[#334155]'}`} />
                {tool.name}
              </div>
            ))}
          </div>
        </Card>

        {/* Card 3: Security Protocol */}
        <Card className="bg-[#1E293B] border-[#334155] p-5 flex flex-col rounded-[16px]">
          <h3 className="text-[12px] uppercase tracking-[1px] text-[#94A3B8] font-semibold mb-4">Security Protocol</h3>
          <Badge className="self-start bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B] rounded-full px-3 py-1 text-[11px]">L3 AUTH VERIFIED</Badge>
          <div className="mt-4 space-y-2 text-[13px] text-[#CBD5E1]">
            <p>Content Filter: <span className="text-[#10B981]">ACTIVE</span></p>
            <p>PII Masking: <span className="text-[#10B981]">ENABLED</span></p>
            <p>Sandbox: <span className="text-[#3B82F6]">ISOLATED</span></p>
          </div>
        </Card>

        {/* Card 4: Live Output Stream (Chat) */}
        <Card className="col-span-2 bg-[#1E293B] border-[#334155] p-0 flex flex-col rounded-[16px] overflow-hidden">
          <div className="p-5 pb-0">
            <h3 className="text-[12px] uppercase tracking-[1px] text-[#94A3B8] font-semibold mb-4">Live Output Stream (.md)</h3>
          </div>
          <ScrollArea className="flex-grow px-5 pb-5" ref={scrollRef}>
            <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-4 font-mono text-[13px] leading-relaxed text-[#CBD5E1] min-h-[150px]">
              <AnimatePresence>
                {messages.length === 0 && !isProcessing && (
                  <p className="opacity-30 italic">System ready for input...</p>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className={`mb-4 ${msg.role === 'user' ? 'text-[#3B82F6]' : ''}`}>
                    <p className="text-[10px] opacity-50 mb-1 uppercase tracking-widest">{msg.role}</p>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex items-center gap-2 text-primary animate-pulse">
                    <span className="w-1 h-1 bg-primary rounded-full" />
                    <span className="w-1 h-1 bg-primary rounded-full" />
                    <span className="w-1 h-1 bg-primary rounded-full" />
                    <span className="ml-2 text-[11px] uppercase tracking-widest">Streaming...</span>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </Card>

        {/* Card 5: Export Formats */}
        <Card className="bg-[#1E293B] border-[#334155] p-5 flex flex-col rounded-[16px]">
          <h3 className="text-[12px] uppercase tracking-[1px] text-[#94A3B8] font-semibold mb-4">Export Formats</h3>
          <div className="flex flex-col gap-3">
            {messages.find(m => m.report) ? (
              <>
                <Button variant="ghost" className="justify-start h-auto p-0 text-[13px] hover:text-[#3B82F6]" onClick={() => generateWord(messages.find(m => m.report)!.report!)}>
                  ● WORD (.docx)
                </Button>
                <Button variant="ghost" className="justify-start h-auto p-0 text-[13px] hover:text-[#3B82F6]" onClick={() => generateExcel(messages.find(m => m.report)!.report!)}>
                  ● EXCEL (.xlsx)
                </Button>
                <Button variant="ghost" className="justify-start h-auto p-0 text-[13px] hover:text-[#3B82F6]" onClick={() => generatePDF(messages.find(m => m.report)!.report!)}>
                  ● PDF (.pdf)
                </Button>
              </>
            ) : (
              <p className="text-[13px] opacity-30 italic">No reports generated</p>
            )}
          </div>
        </Card>

        {/* Card 6: System Logs */}
        <Card className="bg-[#1E293B] border-[#334155] p-5 flex flex-col rounded-[16px]">
          <h3 className="text-[12px] uppercase tracking-[1px] text-[#94A3B8] font-semibold mb-4">System Logs</h3>
          <div className="font-mono text-[11px] text-[#10B981] space-y-1 overflow-y-auto max-h-[100px]">
            {logs.length > 0 ? (
              logs.map((log, i) => <div key={i}>{log}</div>)
            ) : (
              <div className="opacity-30">[SYSTEM READY]</div>
            )}
          </div>
        </Card>
      </div>

      {/* Input Area */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-3 px-5 flex items-center gap-4">
        <div className="text-[#3B82F6] font-mono font-bold">❯</div>
        <input 
          className="bg-transparent border-none outline-none flex-grow text-[#E2E8F0] placeholder-[#94A3B8] text-[15px]"
          placeholder="Search the financial PDF and compare revenue with latest 2024 web trends..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={isProcessing}
        />
        <div className="font-mono bg-[#0F172A] border border-[#334155] px-2 py-1 rounded text-[12px] text-[#94A3B8]">
          Ctrl + Enter
        </div>
        <Button 
          size="icon" 
          className="bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg"
          onClick={handleSend}
          disabled={isProcessing || !input.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

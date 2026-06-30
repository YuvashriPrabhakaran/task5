import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Calendar, 
  Hash, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Save, 
  Database, 
  Terminal, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowUpDown,
  FileCode,
  ShieldCheck,
  Zap,
  RotateCw
} from 'lucide-react';

// Define TS Interfaces
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ConsoleLog {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  requestBody: any;
  status: number;
  responseJson: any;
}

export default function App() {
  // --- STATE ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [databaseMode, setDatabaseMode] = useState<string>('Detecting...');
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Pagination & Filtering
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(5);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal (Create/Edit Drawer)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // Form Fields
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'Pending' | 'In Progress' | 'Completed'>('Pending');
  const [formPriority, setFormPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [formDueDate, setFormDueDate] = useState<string>('');

  // Live Console Logs
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // --- API CALL LOGGER HELPER ---
  const logApiCall = (method: string, url: string, requestBody: any, status: number, responseJson: any) => {
    const newLog: ConsoleLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      method,
      url,
      requestBody,
      status,
      responseJson
    };
    setLogs(prev => [...prev, newLog]);
  };

  // Auto-scroll console logs
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // --- SHOW TOAST BANNER ---
  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // --- FETCH DATA ---
  const fetchTasks = async () => {
    setLoading(true);
    const queryParams = new URLSearchParams({
      search,
      status: statusFilter,
      priority: priorityFilter,
      sortBy,
      sortOrder,
      page: page.toString(),
      limit: limit.toString()
    });

    const url = `/api/tasks?${queryParams.toString()}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      logApiCall('GET', url, null, res.status, data);

      if (data.success) {
        setTasks(data.data);
        setTotal(data.meta.total);
        setTotalPages(data.meta.pages || 1);
        setDatabaseMode(data.meta.databaseMode || 'MongoDB');
      } else {
        triggerToast(data.message || 'Error fetching tasks', 'error');
      }
    } catch (err: any) {
      console.error(err);
      logApiCall('GET', url, null, 500, { success: false, error: 'Network Error', message: err.message });
      triggerToast('Could not connect to API Server gateway', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when query params change
  useEffect(() => {
    fetchTasks();
  }, [search, statusFilter, priorityFilter, sortBy, sortOrder, page]);

  // --- CREATE / UPDATE ACTION ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      triggerToast('Task Title is required', 'error');
      return;
    }
    if (!formDueDate) {
      triggerToast('Due Date is required', 'error');
      return;
    }

    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim(),
      status: formStatus,
      priority: formPriority,
      dueDate: new Date(formDueDate).toISOString()
    };

    const isEdit = !!editingTaskId;
    const url = isEdit ? `/api/tasks/${editingTaskId}` : '/api/tasks';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      logApiCall(method, url, payload, res.status, data);

      if (data.success) {
        triggerToast(isEdit ? 'Task updated successfully' : 'Task created successfully', 'success');
        setIsModalOpen(false);
        resetForm();
        fetchTasks();
      } else {
        triggerToast(data.message || 'Operation failed', 'error');
      }
    } catch (err: any) {
      console.error(err);
      logApiCall(method, url, payload, 500, { success: false, error: 'Network Error', message: err.message });
      triggerToast('Failed to connect to server', 'error');
    }
  };

  // --- DELETE ACTION ---
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    const url = `/api/tasks/${id}`;

    try {
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();

      logApiCall('DELETE', url, null, res.status, data);

      if (data.success) {
        triggerToast('Task deleted successfully', 'success');
        fetchTasks();
      } else {
        triggerToast(data.message || 'Failed to delete task', 'error');
      }
    } catch (err: any) {
      console.error(err);
      logApiCall('DELETE', url, null, 500, { success: false, error: 'Network Error', message: err.message });
      triggerToast('Connection error occurred', 'error');
    }
  };

  // --- EDIT MODAL LAUNCHER ---
  const launchEditModal = (task: Task) => {
    setEditingTaskId(task.id);
    setFormTitle(task.title);
    setFormDescription(task.description);
    setFormStatus(task.status);
    setFormPriority(task.priority);
    // Format date to YYYY-MM-DD
    setFormDueDate(new Date(task.dueDate).toISOString().substring(0, 10));
    setIsModalOpen(true);
  };

  const launchCreateModal = () => {
    setEditingTaskId(null);
    resetForm();
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormStatus('Pending');
    setFormPriority('Medium');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormDueDate(tomorrow.toISOString().substring(0, 10));
  };

  const clearConsole = () => {
    setLogs([]);
  };

  return (
    <div className="bg-[#FDFCFB] min-h-screen text-[#121212] flex flex-col lg:flex-row font-sans select-none relative overflow-x-hidden">
      
      {/* 🏛️ Editorial Sidebar (Left on Desktop, Top on Mobile) */}
      <aside className="w-full lg:w-[320px] border-b lg:border-b-0 lg:border-r border-black/10 flex flex-col p-8 bg-[#F9F7F2] shrink-0">
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold mb-4 opacity-40">Project Overview</p>
          <h1 className="text-4xl font-serif italic leading-none mb-6 text-[#2A4B7C] tracking-tight flex items-center gap-2">
            TaskArchitect
          </h1>
          
          <div className="space-y-6">
            {/* Database Engine Status Details */}
            <section className="border-b border-black/5 pb-4">
              <p className="text-[11px] uppercase tracking-wider font-bold mb-2">RESTful Database</p>
              <div className="flex items-center gap-2 font-mono text-xs text-[#121212]">
                <Database className="w-3.5 h-3.5 text-[#2A4B7C]" />
                <span className="font-bold">
                  {databaseMode.includes('MongoDB') ? 'MongoDB Atlas Cloud' : 'Local Persistent Fallback'}
                </span>
              </div>
            </section>

            <section>
              <p className="text-[11px] uppercase tracking-wider font-bold mb-2">Architecture</p>
              <ul className="text-[13px] space-y-1 font-mono opacity-80 list-none pl-0">
                <li className="flex items-center gap-1.5"><span className="text-xs">📂</span> /backend/controllers</li>
                <li className="flex items-center gap-1.5"><span className="text-xs">📂</span> /backend/models</li>
                <li className="flex items-center gap-1.5"><span className="text-xs">📂</span> /backend/routes</li>
                <li className="flex items-center gap-1.5"><span className="text-xs">📂</span> /frontend/assets</li>
              </ul>
            </section>

            <section className="hidden sm:block">
              <p className="text-[11px] uppercase tracking-wider font-bold mb-2">RESTful Endpoints</p>
              <div className="text-[12px] space-y-2 font-mono">
                <div className="flex justify-between border-b border-black/5 pb-1">
                  <span className="text-blue-700 font-bold">GET</span>
                  <span className="opacity-60">/api/tasks</span>
                </div>
                <div className="flex justify-between border-b border-black/5 pb-1">
                  <span className="text-emerald-700 font-bold">POST</span>
                  <span className="opacity-60">/api/tasks</span>
                </div>
                <div className="flex justify-between border-b border-black/5 pb-1">
                  <span className="text-amber-700 font-bold">PUT</span>
                  <span className="opacity-60">/api/tasks/:id</span>
                </div>
                <div className="flex justify-between border-b border-black/5 pb-1">
                  <span className="text-rose-700 font-bold">DEL</span>
                  <span className="opacity-60">/api/tasks/:id</span>
                </div>
              </div>
            </section>

            <section className="hidden sm:block">
              <p className="text-[11px] uppercase tracking-wider font-bold mb-2">Tech Stack</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-black text-white text-[10px] font-mono">REACT 18</span>
                <span className="px-2 py-1 bg-black text-white text-[10px] font-mono">EXPRESS</span>
                <span className="px-2 py-1 bg-[#2A4B7C] text-white text-[10px] font-mono">MONGODB</span>
              </div>
            </section>
          </div>
        </div>

        <div className="pt-8 border-t border-black/10 mt-6 lg:mt-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 border border-black/20 flex items-center justify-center font-serif italic text-sm font-bold text-[#2A4B7C]">SA</div>
            <div>
              <p className="text-[12px] font-bold text-[#121212]">Senior Architect</p>
              <p className="text-[10px] opacity-60">Internship Submission v1.0</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-white min-w-0">
        
        {/* 🔮 Active Toast Alert */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 50, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 20, x: '-50%' }}
              className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-none shadow-xl border text-xs font-mono font-bold tracking-wider uppercase border-black ${
                toast.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />}
              <span>{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🏛️ Main Header with Counters and actions */}
        <header className="border-b border-black/5 flex flex-col sm:flex-row items-center justify-between px-6 md:px-10 py-6 sm:h-20 bg-white gap-4">
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold opacity-40 tracking-wider">Total Tasks</p>
              <p className="text-xl md:text-2xl font-serif italic text-[#2A4B7C]">{total}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold opacity-40 tracking-wider">Completed</p>
              <p className="text-xl md:text-2xl font-serif italic text-emerald-700">
                {tasks.filter(t => t.status === 'Completed').length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold opacity-40 tracking-wider">In Progress</p>
              <p className="text-xl md:text-2xl font-serif italic text-amber-700">
                {tasks.filter(t => t.status === 'In Progress').length}
              </p>
            </div>
          </div>
          <div className="flex gap-4 w-full sm:w-auto justify-end">
            <button 
              onClick={launchCreateModal}
              className="px-6 py-2 border border-black text-[12px] uppercase tracking-widest font-bold hover:bg-black hover:text-white transition-colors duration-200 rounded-none bg-white text-black cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Task +
            </button>
          </div>
        </header>

        {/* 📋 Central Layout Workspace Grid */}
        <div className="flex-1 p-6 md:p-10 grid grid-cols-1 xl:grid-cols-12 gap-8 overflow-y-auto">
          
          {/* Left panel of Main content: Task Registry (8 columns) */}
          <section className="xl:col-span-8 flex flex-col gap-6">
            
            {/* Elegant Header with title and Status Filters */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-black">
              <div>
                <h2 className="text-4xl md:text-5xl font-serif tracking-tighter">Task Registry</h2>
                <p className="text-xs text-slate-500 font-mono mt-1">Manage and execute software engineering tasks</p>
              </div>
              
              {/* Text Links Status Filter (Interactive) */}
              <div className="flex flex-wrap gap-4 text-[11px] uppercase font-bold tracking-widest">
                <button 
                  onClick={() => { setStatusFilter(''); setPage(1); }}
                  className={`cursor-pointer transition-all ${statusFilter === '' ? 'text-[#2A4B7C] underline font-black' : 'opacity-40 hover:opacity-80'}`}
                >
                  All Tasks
                </button>
                <button 
                  onClick={() => { setStatusFilter('Pending'); setPage(1); }}
                  className={`cursor-pointer transition-all ${statusFilter === 'Pending' ? 'text-amber-700 underline font-black' : 'opacity-40 hover:opacity-80'}`}
                >
                  Pending
                </button>
                <button 
                  onClick={() => { setStatusFilter('In Progress'); setPage(1); }}
                  className={`cursor-pointer transition-all ${statusFilter === 'In Progress' ? 'text-blue-700 underline font-black' : 'opacity-40 hover:opacity-80'}`}
                >
                  In Progress
                </button>
                <button 
                  onClick={() => { setStatusFilter('Completed'); setPage(1); }}
                  className={`cursor-pointer transition-all ${statusFilter === 'Completed' ? 'text-emerald-700 underline font-black' : 'opacity-40 hover:opacity-80'}`}
                >
                  Completed
                </button>
              </div>
            </div>

            {/* Filters Bar Card - Beautiful flat container */}
            <div className="bg-white p-5 border border-black/10 rounded-none flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Searching */}
                <div className="relative flex-grow">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text" 
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search tasks by title or details..."
                    className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-black/15 focus:border-black outline-none transition text-sm text-slate-800 rounded-none"
                  />
                </div>

                {/* Priority filtering */}
                <select 
                  value={priorityFilter}
                  onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                  className="px-4 py-2.5 bg-transparent border border-black/15 outline-none text-xs uppercase tracking-wider font-bold transition text-slate-700 cursor-pointer rounded-none"
                >
                  <option value="">All Priorities</option>
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>

                {/* Sort select dropdown */}
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2.5 bg-transparent border border-black/15 outline-none text-xs uppercase tracking-wider font-bold transition text-slate-700 cursor-pointer rounded-none"
                >
                  <option value="createdAt">Created Date</option>
                  <option value="dueDate">Due Date</option>
                  <option value="title">Alphabetical</option>
                </select>

                <button 
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-2.5 border border-black/15 hover:border-black text-slate-600 hover:text-black transition cursor-pointer flex items-center justify-center rounded-none bg-transparent"
                  title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>

              <div className="h-px bg-black/5 w-full" />

              <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                <span>SYSTEM_PERSISTENCE: ONLINE</span>
                <span>
                  Showing {total > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, total)} of {total} Tasks
                </span>
              </div>
            </div>

            {/* 📂 Task Cards Grid */}
            <div className="grid grid-cols-1 gap-6">
              {loading ? (
                // Shimmer Loaders
                <div className="flex flex-col gap-4">
                  {[1, 2].map(n => (
                    <div key={n} className="bg-white border border-black/10 rounded-none p-6 animate-pulse flex flex-col gap-3">
                      <div className="h-6 bg-slate-200 w-1/4" />
                      <div className="h-4 bg-slate-200 w-3/4" />
                      <div className="h-4 bg-slate-200 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : tasks.length === 0 ? (
                // Empty state
                <div className="border border-dashed border-black/20 bg-gray-50/50 p-12 text-center flex flex-col items-center gap-4 rounded-none">
                  <div className="w-12 h-12 border border-black/20 rounded-full flex items-center justify-center opacity-40">
                    <CheckSquare className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-serif font-bold text-slate-800">No active tasks found</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1 mx-auto font-mono">
                      Modify criteria or click "New Task" to document a new task record.
                    </p>
                  </div>
                </div>
              ) : (
                // Active list
                <div className="flex flex-col gap-6">
                  {tasks.map(task => {
                    const dueDateString = new Date(task.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });

                    // Border color per priority
                    let priorityBorder = 'border-l-4 border-slate-300';
                    let priorityBadgeBg = 'bg-slate-100 text-slate-800 border-slate-200';
                    if (task.priority === 'High') {
                      priorityBorder = 'border-l-4 border-rose-500';
                      priorityBadgeBg = 'bg-rose-50 text-rose-800 border-rose-100';
                    } else if (task.priority === 'Medium') {
                      priorityBorder = 'border-l-4 border-amber-500';
                      priorityBadgeBg = 'bg-amber-50 text-amber-800 border-amber-100';
                    } else {
                      priorityBorder = 'border-l-4 border-emerald-500';
                      priorityBadgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                    }

                    // Status Badge Style
                    let statusBadge = 'bg-slate-100 text-slate-700';
                    if (task.status === 'Completed') {
                      statusBadge = 'bg-emerald-100 text-emerald-800';
                    } else if (task.status === 'In Progress') {
                      statusBadge = 'bg-blue-100 text-blue-800';
                    }

                    return (
                      <motion.div
                        layoutId={`task-card-${task.id}`}
                        key={task.id}
                        className={`${priorityBorder} bg-white border border-black/10 border-l-0 rounded-none p-6 flex flex-col justify-between hover:shadow-md transition duration-150 relative group`}
                      >
                        <header>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-mono text-slate-500 font-bold tracking-tight">
                              #ID_{task.id.slice(0, 6).toUpperCase()}
                            </span>
                            <div className="flex gap-2">
                              <span className={`px-2 py-0.5 border text-[9px] font-bold uppercase tracking-wider rounded-none ${priorityBadgeBg}`}>
                                {task.priority} Priority
                              </span>
                              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-none ${statusBadge}`}>
                                {task.status}
                              </span>
                            </div>
                          </div>
                          
                          <h3 className="text-xl font-serif font-semibold leading-snug group-hover:text-[#2A4B7C] transition-colors">
                            {task.title}
                          </h3>
                          <p className="text-sm text-slate-600 mt-2 line-clamp-3 leading-relaxed font-sans font-light">
                            {task.description || 'No description provided.'}
                          </p>
                        </header>

                        <footer className="mt-6 flex justify-between items-end border-t border-black/5 pt-4">
                          <div className="text-[11px]">
                            <p className="opacity-40 uppercase font-bold tracking-wider text-[9px]">Due Date</p>
                            <p className="font-mono font-bold text-slate-700">{dueDateString}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => launchEditModal(task)}
                              className="p-2 border border-black/10 hover:border-black bg-[#F9F7F2] hover:bg-black hover:text-white transition duration-150 text-slate-700 cursor-pointer rounded-none"
                              title="Edit Task Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(task.id)}
                              className="p-2 border border-black/10 hover:border-rose-600 bg-[#FDFCFB] hover:bg-rose-50 hover:text-rose-600 transition duration-150 text-slate-500 cursor-pointer rounded-none"
                              title="Delete Task permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </footer>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 🧮 Pagination Controls */}
            <div className="flex items-center justify-between border-t border-black/10 pt-6 mt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-4 py-2 border border-black text-xs uppercase tracking-widest font-bold hover:bg-black hover:text-white transition disabled:opacity-30 disabled:pointer-events-none text-slate-700 rounded-none bg-white cursor-pointer"
              >
                ← Previous
              </button>
              <span className="text-xs font-bold text-slate-700 font-mono tracking-widest">
                PAGE {page} OF {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-4 py-2 border border-black text-xs uppercase tracking-widest font-bold hover:bg-black hover:text-white transition disabled:opacity-30 disabled:pointer-events-none text-slate-700 rounded-none bg-white cursor-pointer"
              >
                Next →
              </button>
            </div>

          </section>

          {/* Right panel: Live REST API Network Console Ledger (4 columns) */}
          <section className="xl:col-span-4 flex flex-col gap-6 xl:sticky xl:top-8">
            
            <div className="bg-[#F9F7F2] text-[#121212] border border-black flex flex-col h-[600px] rounded-none">
              {/* Console Header */}
              <div className="bg-white px-4 py-3 border-b border-black flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-[#2A4B7C] rounded-none animate-pulse" />
                  <span className="text-[10px] font-bold text-[#121212] font-mono tracking-widest uppercase flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5 text-[#2A4B7C]" /> API Ledger Console
                  </span>
                </div>
                <button 
                  onClick={clearConsole}
                  className="text-[9px] text-[#121212] hover:bg-black hover:text-white font-mono border border-black px-2.5 py-1 transition cursor-pointer uppercase font-bold tracking-wider"
                >
                  Clear Logs
                </button>
              </div>

              {/* Console Scrollable Area */}
              <div className="p-4 flex-grow overflow-y-auto font-mono text-[11px] flex flex-col gap-4 scrollbar-thin">
                {logs.length === 0 ? (
                  <div className="text-slate-600 leading-relaxed flex flex-col gap-3 font-mono">
                    <div className="text-[#2A4B7C] font-bold flex items-center gap-1 uppercase tracking-wider text-xs">
                      <Zap className="w-4 h-4 text-amber-500 shrink-0" /> Interceptor Ready
                    </div>
                    <p className="text-xs">
                      Perform interface transactions (create, edit, delete or filter task schemas) to inspect local/cloud server requests and JSON outputs in real-time.
                    </p>
                  </div>
                ) : (
                  logs.map(log => {
                    let methodColor = 'text-blue-700';
                    let methodBg = 'bg-blue-50 border-blue-200';
                    if (log.method === 'POST') {
                      methodColor = 'text-emerald-700';
                      methodBg = 'bg-emerald-50 border-emerald-200';
                    }
                    if (log.method === 'PUT') {
                      methodColor = 'text-amber-700';
                      methodBg = 'bg-amber-50 border-amber-200';
                    }
                    if (log.method === 'DELETE') {
                      methodColor = 'text-rose-700';
                      methodBg = 'bg-rose-50 border-rose-200';
                    }

                    const isError = log.status >= 400;

                    return (
                      <div key={log.id} className="border-b border-black/10 pb-4 flex flex-col gap-2 last:border-b-0">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-mono">{log.timestamp}</span>
                          <span className={`px-2 py-0.5 border font-bold text-[9px] ${methodColor} ${methodBg} rounded-none`}>
                            {log.method}
                          </span>
                        </div>
                        <div className="text-xs text-[#2A4B7C] font-bold break-all select-all font-mono leading-tight">{log.url}</div>
                        
                        {log.requestBody && (
                          <div className="mt-1">
                            <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase font-mono block mb-1">Payload (JSON)</span>
                            <pre className="bg-white p-2.5 border border-black/10 rounded-none text-slate-700 text-[10px] overflow-x-auto max-h-32">{JSON.stringify(log.requestBody, null, 2)}</pre>
                          </div>
                        )}

                        <div className="mt-1">
                          <div className="flex items-center justify-between text-[9px] font-mono mb-1">
                            <span className="font-bold tracking-wider text-slate-400 uppercase">Response Body</span>
                            <span className={`font-bold ${isError ? 'text-rose-700' : 'text-emerald-700'}`}>HTTP {log.status}</span>
                          </div>
                          <pre className="bg-white p-2.5 border border-black/10 rounded-none text-indigo-950 text-[10px] overflow-x-auto max-h-48">{JSON.stringify(log.responseJson, null, 2)}</pre>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={consoleEndRef} />
              </div>
            </div>

          </section>

        </div>

        {/* 📥 Editorial Form Drawer */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 overflow-hidden">
              <div className="absolute inset-0 overflow-hidden">
                {/* Overlay background */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsModalOpen(false)}
                  className="absolute inset-0 bg-[#121212]/30 backdrop-blur-xs transition-opacity"
                />

                {/* Slider pane */}
                <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                  <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 22, stiffness: 180 }}
                    className="pointer-events-auto w-screen max-w-md"
                  >
                    <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl border-l border-black">
                      {/* Header */}
                      <div className="bg-[#F9F7F2] px-6 py-6 border-b border-black flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-serif font-bold text-[#121212]">
                            {editingTaskId ? 'Edit Task Config' : 'Create Task Entry'}
                          </h2>
                          <p className="text-xs text-slate-500 font-mono mt-1">
                            Update parameters in the datastore registry
                          </p>
                        </div>
                        <button 
                          onClick={() => setIsModalOpen(false)}
                          className="border border-black p-1.5 text-black hover:bg-black hover:text-white transition cursor-pointer rounded-none"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Form Block */}
                      <form onSubmit={handleSubmit} className="flex-grow flex flex-col gap-6 p-6 overflow-y-auto bg-white font-sans">
                        
                        {/* Title */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-[#121212] uppercase tracking-wider font-mono">Task Title *</label>
                          <input 
                            type="text" 
                            required
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            placeholder="e.g. Wire up Express routing"
                            className="px-4 py-2.5 border border-black/15 focus:border-black outline-none text-sm transition rounded-none bg-transparent"
                          />
                        </div>

                        {/* Description */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-[#121212] uppercase tracking-wider font-mono">Task Details</label>
                          <textarea 
                            rows={4}
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            placeholder="Provide a detailed description of architectural task..."
                            className="px-4 py-2.5 border border-black/15 focus:border-black outline-none text-sm transition resize-none rounded-none bg-transparent"
                          />
                        </div>

                        {/* Status / Priority */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-[#121212] uppercase tracking-wider font-mono">Status</label>
                            <select 
                              value={formStatus}
                              onChange={(e: any) => setFormStatus(e.target.value)}
                              className="px-3.5 py-2.5 border border-black/15 bg-white focus:border-black outline-none text-xs uppercase tracking-wider font-bold transition text-slate-700 cursor-pointer rounded-none"
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-[#121212] uppercase tracking-wider font-mono">Priority</label>
                            <select 
                              value={formPriority}
                              onChange={(e: any) => setFormPriority(e.target.value)}
                              className="px-3.5 py-2.5 border border-black/15 bg-white focus:border-black outline-none text-xs uppercase tracking-wider font-bold transition text-slate-700 cursor-pointer rounded-none"
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                            </select>
                          </div>
                        </div>

                        {/* Due date */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-[#121212] uppercase tracking-wider font-mono">Due Date *</label>
                          <input 
                            type="date" 
                            required
                            value={formDueDate}
                            onChange={(e) => setFormDueDate(e.target.value)}
                            className="px-4 py-2.5 border border-black/15 focus:border-black outline-none text-sm transition text-slate-700 rounded-none bg-transparent"
                          />
                        </div>

                        {/* Form Footer Action Buttons */}
                        <div className="mt-auto pt-6 border-t border-black/10 flex items-center justify-end gap-3">
                          <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className="px-5 py-2.5 border border-black/20 hover:border-black font-bold uppercase tracking-wider text-[11px] bg-white text-slate-700 transition cursor-pointer rounded-none"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="px-6 py-2.5 bg-black hover:bg-slate-800 text-white font-bold uppercase tracking-widest text-[11px] transition flex items-center gap-1.5 cursor-pointer rounded-none"
                          >
                            <Save className="w-4 h-4" /> Save Record
                          </button>
                        </div>

                      </form>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* 🛡️ Secured Editorial Footer */}
        <footer className="h-12 border-t border-black/5 bg-[#F9F7F2] flex items-center px-6 md:px-10 justify-between text-[10px] font-mono opacity-50">
          <span className="hidden sm:inline">SYSTEM_STATUS: STABLE</span>
          <span>DATABASE_ENGINE: CONNECTED</span>
          <span>2026 © ARCHITECT_CORE</span>
        </footer>

      </main>

    </div>
  );
}

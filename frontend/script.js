/**
 * Task Management System - Frontend API Client
 * --------------------------------------------------
 * Handles all CRUD operations, filtering, sorting, pagination,
 * and logs raw HTTP request/response details to the interactive console.
 */

// 🔌 Dynamic API URL Detection
// Points to relative path so it automatically works in both AI Studio Preview and local setups.
const API_BASE_URL = window.location.origin + '/api/tasks';

// 🗄️ Application State
let state = {
  tasks: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 5,
    pages: 1
  },
  filters: {
    search: '',
    status: '',
    priority: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  }
};

// --- DOM ELEMENTS ---
const taskListEl = document.getElementById('task-list');
const dbModeEl = document.getElementById('db-mode');
const consoleLogsEl = document.getElementById('console-logs');
const paginationInfoEl = document.getElementById('pagination-info');
const pageIndicatorEl = document.getElementById('page-indicator');
const toastContainerEl = document.getElementById('toast-container');

// Search & Filter elements
const inputSearch = document.getElementById('input-search');
const filterStatus = document.getElementById('filter-status');
const filterPriority = document.getElementById('filter-priority');
const sortBySelect = document.getElementById('sort-by');
const btnToggleSortOrder = document.getElementById('btn-toggle-sort-order');
const sortOrderIcon = document.getElementById('sort-order-icon');

// Pagination elements
const btnPrevPage = document.getElementById('btn-prev-page');
const btnNextPage = document.getElementById('btn-next-page');

// Modal & Form elements
const taskModal = document.getElementById('task-modal');
const modalContent = document.getElementById('modal-content');
const modalTitle = document.getElementById('modal-title');
const modalSubtitle = document.getElementById('modal-subtitle');
const taskForm = document.getElementById('task-form');
const taskIdInput = document.getElementById('task-id');
const formTitle = document.getElementById('form-title');
const formDescription = document.getElementById('form-description');
const formStatus = document.getElementById('form-status');
const formPriority = document.getElementById('form-priority');
const formDueDate = document.getElementById('form-due-date');

// Buttons for opening/closing modal
const btnNewTask = document.getElementById('btn-new-task');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelTask = document.getElementById('btn-cancel-task');
const btnClearConsole = document.getElementById('btn-clear-console');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Set default due date to tomorrow's date for ease of creation
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  formDueDate.value = tomorrow.toISOString().substring(0, 10);

  // Load Tasks
  fetchTasks();

  // Attach Event Listeners
  setupEventListeners();
});

// --- HTTP LOGGER HELPER ---
// Appends a neat, styled terminal block of the request/response to the Interactive Console
function logHttpRequest(method, url, requestBody, responseStatus, responseJson) {
  const timestamp = new Date().toLocaleTimeString();
  
  // Format Method colors
  let methodColor = 'text-blue-400';
  if (method === 'POST') methodColor = 'text-emerald-400';
  if (method === 'PUT') methodColor = 'text-amber-400';
  if (method === 'DELETE') methodColor = 'text-red-400';

  // Format Status Code colors
  let statusColor = 'text-emerald-400';
  if (responseStatus >= 400) statusColor = 'text-red-400';
  else if (responseStatus >= 300) statusColor = 'text-yellow-400';

  const logBlock = document.createElement('div');
  logBlock.className = 'border-b border-slate-800 pb-3 mb-2 flex flex-col gap-1';
  logBlock.innerHTML = `
    <div class="flex items-center justify-between text-[10px] text-slate-500 font-mono">
      <span>${timestamp}</span>
      <span class="px-1.5 py-0.5 rounded bg-slate-800 font-semibold ${methodColor}">${method}</span>
    </div>
    <div class="text-xs text-indigo-300 select-all font-mono break-all">${url}</div>
    ${requestBody ? `
      <div class="mt-1">
        <div class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Request Payload:</div>
        <pre class="bg-slate-950 p-2 rounded border border-slate-800/50 text-slate-300 font-mono text-[10px] overflow-x-auto max-h-32">${JSON.stringify(requestBody, null, 2)}</pre>
      </div>
    ` : ''}
    <div class="mt-1">
      <div class="flex items-center justify-between">
        <span class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Response:</span>
        <span class="font-mono text-[11px] font-bold ${statusColor}">HTTP ${responseStatus}</span>
      </div>
      <pre class="bg-slate-950 p-2 rounded border border-slate-800 text-indigo-200 font-mono text-[10px] overflow-x-auto max-h-48">${JSON.stringify(responseJson, null, 2)}</pre>
    </div>
  `;

  consoleLogsEl.appendChild(logBlock);
  // Auto-scroll to bottom of logs
  consoleLogsEl.scrollTop = consoleLogsEl.scrollHeight;
}

// --- API ACTIONS (CRUD) ---

// 1. GET (Read all)
async function fetchTasks() {
  showShimmerLoaders();

  const { search, status, priority, sortBy, sortOrder } = state.filters;
  const { page, limit } = state.pagination;

  // Construct query string matching bonus requirement options
  const queryParams = new URLSearchParams({
    search,
    status,
    priority,
    sortBy,
    sortOrder,
    page,
    limit
  });

  const url = `${API_BASE_URL}?${queryParams.toString()}`;

  try {
    const res = await fetch(url);
    const json = await res.json();

    logHttpRequest('GET', url, null, res.status, json);

    if (json.success) {
      state.tasks = json.data;
      state.pagination = {
        total: json.meta.total,
        page: json.meta.page,
        limit: json.meta.limit,
        pages: json.meta.pages
      };

      // Update Database Mode in Header
      updateDatabaseBadge(json.meta.databaseMode);

      // Render tasks in GUI
      renderTasks();
    } else {
      showToast(json.message || 'Failed to fetch tasks', 'error');
    }
  } catch (error) {
    console.error('Fetch error:', error);
    logHttpRequest('GET', url, null, 500, { success: false, error: 'Network Error', message: error.message });
    showToast('Failed to connect to the backend server', 'error');
    renderEmptyState('Failed to connect. Please check if server is running.');
  }
}

// 2. POST (Create) or PUT (Update)
async function saveTask(taskData) {
  const isEdit = !!taskData.id;
  const url = isEdit ? `${API_BASE_URL}/${taskData.id}` : API_BASE_URL;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });
    const json = await res.json();

    logHttpRequest(method, url, taskData, res.status, json);

    if (json.success) {
      showToast(isEdit ? 'Task updated successfully' : 'Task created successfully', 'success');
      closeTaskModal();
      fetchTasks(); // Refresh list
    } else {
      showToast(json.message || 'Operation failed', 'error');
    }
  } catch (error) {
    console.error('Save error:', error);
    logHttpRequest(method, url, taskData, 500, { success: false, error: 'Network Error', message: error.message });
    showToast('Failed to save task due to a server connection error', 'error');
  }
}

// 3. DELETE
async function deleteTask(id) {
  if (!confirm('Are you absolutely sure you want to delete this task? This action is irreversible.')) {
    return;
  }

  const url = `${API_BASE_URL}/${id}`;

  try {
    const res = await fetch(url, {
      method: 'DELETE'
    });
    const json = await res.json();

    logHttpRequest('DELETE', url, null, res.status, json);

    if (json.success) {
      showToast('Task deleted successfully', 'success');
      fetchTasks(); // Refresh list
    } else {
      showToast(json.message || 'Failed to delete task', 'error');
    }
  } catch (error) {
    console.error('Delete error:', error);
    logHttpRequest('DELETE', url, null, 500, { success: false, error: 'Network Error', message: error.message });
    showToast('Failed to delete task due to a server connection error', 'error');
  }
}

// --- RENDER FUNCTIONS ---

function renderTasks() {
  taskListEl.innerHTML = '';

  const tasks = state.tasks;

  if (!tasks || tasks.length === 0) {
    renderEmptyState('No tasks found matching your filters. Try clearing your filters or add a new task!');
    updatePaginationControls();
    return;
  }

  tasks.forEach(task => {
    // Generate dates
    const due = new Date(task.dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Color definitions for badges
    let statusClass = '';
    if (task.status === 'Completed') statusClass = 'bg-green-100 text-green-800 border-green-200';
    else if (task.status === 'In Progress') statusClass = 'bg-amber-100 text-amber-800 border-amber-200';
    else statusClass = 'bg-slate-100 text-slate-800 border-slate-200';

    let priorityClass = '';
    if (task.priority === 'High') priorityClass = 'bg-red-50 text-red-700 border-red-100';
    else if (task.priority === 'Medium') priorityClass = 'bg-amber-50 text-amber-700 border-amber-100';
    else priorityClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';

    const card = document.createElement('div');
    card.className = 'bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-200 shadow-sm hover:shadow-md transition duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 group';
    card.id = `task-card-${task.id}`;
    
    card.innerHTML = `
      <div class="flex-grow flex flex-col gap-2">
        <div class="flex items-start md:items-center flex-wrap gap-2">
          <h3 class="text-base font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition">${escapeHtml(task.title)}</h3>
          
          <div class="flex items-center gap-1.5 ml-1">
            <span class="px-2 py-0.5 rounded-full border text-[11px] font-medium ${statusClass}">
              ${task.status}
            </span>
            <span class="px-2 py-0.5 rounded-full border text-[11px] font-medium ${priorityClass}">
              ${task.priority} Priority
            </span>
          </div>
        </div>
        
        <p class="text-sm text-slate-600 font-normal line-clamp-2 max-w-2xl">${escapeHtml(task.description || 'No description provided.')}</p>
        
        <div class="flex items-center gap-4 mt-1 text-xs text-slate-500 font-medium font-mono">
          <span class="flex items-center gap-1">
            <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
            Due: ${due}
          </span>
          <span class="hidden sm:inline-flex items-center gap-1">
            <i data-lucide="hash" class="w-3.5 h-3.5"></i>
            ID: <span class="select-all">${task.id}</span>
          </span>
        </div>
      </div>
      
      <!-- Action buttons -->
      <div class="flex items-center gap-2 self-end md:self-center border-t border-slate-50 pt-3 md:pt-0 md:border-t-0">
        <button onclick="openEditModal('${task.id}')" class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition" title="Edit Task">
          <i data-lucide="edit" class="w-4.5 h-4.5"></i>
        </button>
        <button onclick="handleDeleteTask('${task.id}')" class="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition" title="Delete Task">
          <i data-lucide="trash-2" class="w-4.5 h-4.5"></i>
        </button>
      </div>
    `;

    taskListEl.appendChild(card);
  });

  // Re-create Lucide icons inside card injections
  if (window.lucide) {
    window.lucide.createIcons();
  }

  updatePaginationControls();
}

function showShimmerLoaders() {
  taskListEl.innerHTML = `
    <div class="animate-pulse bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-3">
      <div class="h-5 bg-slate-200 rounded-md w-1/3"></div>
      <div class="h-4 bg-slate-200 rounded-md w-2/3"></div>
      <div class="flex gap-2">
        <div class="h-6 bg-slate-200 rounded-full w-16"></div>
        <div class="h-6 bg-slate-200 rounded-full w-16"></div>
      </div>
    </div>
    <div class="animate-pulse bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-3">
      <div class="h-5 bg-slate-200 rounded-md w-1/4"></div>
      <div class="h-4 bg-slate-200 rounded-md w-1/2"></div>
      <div class="flex gap-2">
        <div class="h-6 bg-slate-200 rounded-full w-16"></div>
        <div class="h-6 bg-slate-200 rounded-full w-16"></div>
      </div>
    </div>
  `;
}

function renderEmptyState(message) {
  taskListEl.innerHTML = `
    <div class="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center gap-4">
      <div class="p-4 bg-slate-50 text-slate-400 rounded-full">
        <i data-lucide="clipboard-list" class="w-10 h-10"></i>
      </div>
      <div>
        <h4 class="text-base font-bold text-slate-800">No Tasks Available</h4>
        <p class="text-sm text-slate-500 max-w-md mt-1 mx-auto">${message}</p>
      </div>
    </div>
  `;
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// --- CONTROLLER EVENT HANDLING ---

function setupEventListeners() {
  // Opening the Modal for New Task
  btnNewTask.addEventListener('click', () => {
    openCreateModal();
  });

  // Closing the modal
  btnCloseModal.addEventListener('click', closeTaskModal);
  btnCancelTask.addEventListener('click', closeTaskModal);
  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) closeTaskModal();
  });

  // Form Submission
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const taskData = {
      title: formTitle.value.trim(),
      description: formDescription.value.trim(),
      status: formStatus.value,
      priority: formPriority.value,
      dueDate: formDueDate.value
    };

    if (taskIdInput.value) {
      taskData.id = taskIdInput.value;
    }

    saveTask(taskData);
  });

  // Search input typing (Debounced search input)
  let searchTimeout;
  inputSearch.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    state.filters.search = e.target.value;
    state.pagination.page = 1; // Reset to page 1 on new search
    searchTimeout = setTimeout(() => {
      fetchTasks();
    }, 450);
  });

  // Filters
  filterStatus.addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    state.pagination.page = 1;
    fetchTasks();
  });

  filterPriority.addEventListener('change', (e) => {
    state.filters.priority = e.target.value;
    state.pagination.page = 1;
    fetchTasks();
  });

  // Sorting
  sortBySelect.addEventListener('change', (e) => {
    state.filters.sortBy = e.target.value;
    fetchTasks();
  });

  btnToggleSortOrder.addEventListener('click', () => {
    state.filters.sortOrder = state.filters.sortOrder === 'asc' ? 'desc' : 'asc';
    
    // Toggle icon visual
    if (state.filters.sortOrder === 'asc') {
      sortOrderIcon.setAttribute('data-lucide', 'arrow-up-narrow-wide');
    } else {
      sortOrderIcon.setAttribute('data-lucide', 'arrow-down-narrow-wide');
    }
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
    fetchTasks();
  });

  // Pagination Controls
  btnPrevPage.addEventListener('click', () => {
    if (state.pagination.page > 1) {
      state.pagination.page--;
      fetchTasks();
    }
  });

  btnNextPage.addEventListener('click', () => {
    if (state.pagination.page < state.pagination.pages) {
      state.pagination.page++;
      fetchTasks();
    }
  });

  // Clear Terminal Output
  btnClearConsole.addEventListener('click', () => {
    consoleLogsEl.innerHTML = `
      <div class="text-slate-500 font-mono">[CONSOLE CLEANED] Console logger ready.</div>
    `;
  });
}

// Open modal for Task Creation
function openCreateModal() {
  modalTitle.textContent = 'Add New Task';
  modalSubtitle.textContent = 'Create a task in the RESTful database.';
  taskForm.reset();
  taskIdInput.value = '';
  
  // Tomorrow as default
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  formDueDate.value = tomorrow.toISOString().substring(0, 10);
  
  // Open Animation
  taskModal.classList.add('modal-overlay-open');
  modalContent.classList.add('modal-content-open');
}

// Open modal for Editing
window.openEditModal = async function(id) {
  modalTitle.textContent = 'Edit Task';
  modalSubtitle.textContent = `Modify fields for task ${id}`;
  
  // Show Loading state inside form fields
  taskModal.classList.add('modal-overlay-open');
  modalContent.classList.add('modal-content-open');

  try {
    const url = `${API_BASE_URL}/${id}`;
    const res = await fetch(url);
    const json = await res.json();
    
    logHttpRequest('GET', url, null, res.status, json);

    if (json.success) {
      const task = json.data;
      
      taskIdInput.value = task.id;
      formTitle.value = task.title;
      formDescription.value = task.description || '';
      formStatus.value = task.status;
      formPriority.value = task.priority;
      
      // Format date to YYYY-MM-DD
      const rawDate = new Date(task.dueDate);
      const formattedDate = rawDate.toISOString().substring(0, 10);
      formDueDate.value = formattedDate;
    } else {
      showToast('Failed to load task details', 'error');
      closeTaskModal();
    }
  } catch (error) {
    console.error('Edit modal fetch error:', error);
    showToast('Network error loading task details', 'error');
    closeTaskModal();
  }
};

function closeTaskModal() {
  taskModal.classList.remove('modal-overlay-open');
  modalContent.classList.remove('modal-content-open');
}

window.handleDeleteTask = function(id) {
  deleteTask(id);
};

// --- PAGINATION / STATUS HELPERS ---

function updatePaginationControls() {
  const { total, page, limit, pages } = state.pagination;
  
  // Update showing text
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  paginationInfoEl.textContent = `Showing ${start}-${end} of ${total} tasks`;

  // Update Page indicator
  pageIndicatorEl.textContent = `Page ${page} of ${pages || 1}`;

  // Disable button states
  btnPrevPage.disabled = (page <= 1);
  btnNextPage.disabled = (page >= pages);
}

function updateDatabaseBadge(dbMode) {
  if (dbMode.includes('MongoDB')) {
    dbModeEl.className = 'px-3 py-1 bg-green-50 border border-green-200 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm';
    dbModeEl.innerHTML = `<span class="w-2 h-2 bg-green-500 rounded-full"></span> MongoDB Connected`;
  } else {
    dbModeEl.className = 'px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm';
    dbModeEl.innerHTML = `<span class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span> Local Fallback Storage`;
  }
}

// --- UTILITY FUNCTIONS ---

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'success') {
  toastContainerEl.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition duration-300 transform translate-y-0`;
  
  let bgClass = 'bg-green-50 text-green-800 border-green-200';
  let iconName = 'check-circle';
  if (type === 'error') {
    bgClass = 'bg-red-50 text-red-800 border-red-200';
    iconName = 'alert-triangle';
  }

  toastContainerEl.className += ` ${bgClass}`;
  toastContainerEl.innerHTML = `
    <i data-lucide="${iconName}" class="w-4.5 h-4.5"></i>
    <span>${message}</span>
  `;
  
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Fade out timer
  setTimeout(() => {
    toastContainerEl.classList.add('hidden');
  }, 4000);

  toastContainerEl.classList.remove('hidden');
}

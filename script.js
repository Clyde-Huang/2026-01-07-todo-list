let todoList = []; // 刷新，覆蓋假資料
let currentFilter = 'all';
let elements = {};


// 💥A、storejs 的 key 名稱
const STORAGE_KEY = 'myTodoList';

// 📡1、建立 Broadcast Channel（用於多頁面同步)
// ****若是用 API 傳送資料就不是用 Broadcast Channel ****
const TODO_CHANNEL = new BroadcastChannel('todo-sync-channel');

// 💥B、從 localStorage 讀取資料
function loadFromStorage() {
    const data = store.get(STORAGE_KEY);
    if (data && Array.isArray(data)) {
        todoList = data;
        console.log('✅ 已從本地儲存載入資料:', todoList);
    } else {
        todoList = [];
        console.log('📝 本地儲存無資料，初始化空陣列');
    }
}

// 💥C、儲存資料到 localStorage
function saveToStorage() {
    store.set(STORAGE_KEY, todoList);
    console.log('💾 已儲存到本地:', todoList);

    // 📡3、通知其他頁面資料已更新
    TODO_CHANNEL.postMessage({
        action: 'update',
        timestamp: Date.now()
    });
    console.log('📤 已廣播更新訊息給其他頁面');

}

// 工具函式：綁定事件監聽
function bindEventById(id, event, handler) {
    const element = document.getElementById(id);
    if (!element) {
        console.error(`元素 #${id} 不存在，請檢查 HTML 結構`);
        return;
    }
    element.addEventListener(event, handler);
    return element;
}

document.addEventListener('DOMContentLoaded', function () {
    console.log('網頁載入完成!');

    // 💥D、網頁載入時，先讀取本地資料
    loadFromStorage();

    // 📡2、監聽來自其他頁面的廣播訊息
    TODO_CHANNEL.onmessage = function (event) {
        console.log('📡 收到其他頁面的更新訊息:', event.data);
        loadFromStorage();  // 重新從 localStorage 讀取最新資料
        render();           // 重新渲染畫面
    }

    // 初始化 DOM 元素（一次性抓取，避免重複查詢）
    elements = {
        input: document.getElementById('todoInput'),
        container: document.getElementById('todoListContainer'),
        statistics: document.getElementById('todoStatistics')
    };

    // 綁定事件
    bindEventById('addTodoBtn', 'click', function (e) {
        e.preventDefault();
        addTodo();
    });

    bindEventById('todoInput', 'keypress', function (e) {
        if (e.key === 'Enter') {
            addTodo();
        }
    });

    bindEventById('clearCompletedBtn', 'click', function (e) {
        e.preventDefault();
        clearCompleted();
    });

    bindEventById('tabAll', 'click', (e) => {
        e.preventDefault();
        filterByStatus('all');
    });

    bindEventById('tabUncompleted', 'click', (e) => {
        e.preventDefault();
        filterByStatus('uncompleted');
    });

    bindEventById('tabCompleted', 'click', (e) => {
        e.preventDefault();
        filterByStatus('completed');
    });

    // 事件委託：處理刪除和切換完成狀態
    elements.container.addEventListener('click', function (e) {
        const deleteBtn = e.target.closest('.delete-todo-btn');
        if (deleteBtn) {
            e.preventDefault();
            const todoId = parseInt(deleteBtn.dataset.id);
            deleteTodo(todoId);
        }
    });

    elements.container.addEventListener('change', function (e) {
        if (e.target.classList.contains('todoList_input')) {
            const todoId = parseInt(e.target.dataset.id);
            toggleTodo(todoId);
        }
    });

    // 💥E、初次渲染畫面（使用已載入的資料）
    render();
});

// ⬇️function 區
function addTodo() {
    const text = elements.input.value.trim();

    if (text === "") {
        alert("請輸入內容");
        return;
    }

    const newTodo = {
        id: Date.now(),
        text: text,
        completed: false
    };

    todoList.unshift(newTodo);
    elements.input.value = "";

    // 💥F、新增後儲存
    saveToStorage();
    render();
}

function render() {
    if (!elements.container) return;

    let showList = todoList;

    switch (currentFilter) {
        case 'completed':
            showList = todoList.filter(item => item.completed === true);
            break;
        case 'uncompleted':
            showList = todoList.filter(item => item.completed === false);
            break;
        case 'all':
        default:
            showList = todoList;
            break;
    }

    const completedCount = todoList.filter(item => item.completed).length;
    elements.statistics.textContent = `${completedCount} 個已完成項目`;

    if (showList.length === 0) {
        elements.container.innerHTML = '<li class="no_todo">目前沒有項目</li>';
        return;
    }

    elements.container.innerHTML = showList.map(item => `
        <li>
            <label class="todoList_label">
                <input class="todoList_input" type="checkbox" ${item.completed ? 'checked' : ''} data-id="${item.id}">
                <span>${item.text}</span>
            </label>
            <a href="#" class="delete-todo-btn" data-id="${item.id}">
                <i class="fa fa-times delBtn"></i>
            </a>
        </li>
    `).join("");
}

function toggleTodo(id) {
    const item = todoList.find(t => t.id === id);
    if (item) {
        item.completed = !item.completed;

        // 💥G、切換狀態後儲存
        saveToStorage();
        render();
    }
}

function deleteTodo(id) {
    if (confirm("確定要刪除該項目?")) {
        todoList = todoList.filter(t => t.id !== id);

        // 💥H、刪除後儲存
        saveToStorage();
        render();
    }
}

function clearCompleted() {
    if (confirm("確定要清除所有已完成項目嗎？")) {
        todoList = todoList.filter(t => !t.completed);

        // 💥I、清除後儲存
        saveToStorage();
        render();
    }
}

function filterByStatus(status) {
    currentFilter = status;
    const tabs = document.querySelectorAll('.todoList_tab a');
    tabs.forEach(tab => tab.classList.remove('active'));

    switch (status) {
        case 'all':
            tabs[0].classList.add('active');
            break;
        case 'uncompleted':
            tabs[1].classList.add('active');
            break;
        case 'completed':
            tabs[2].classList.add('active');
            break;
    }

    render();
}

// ⬆️function 區


/* 
================================================================================
💥 storejs 套件 vs. 瀏覽器底層原生代碼對照表 💥
================================================================================

【💥B、從讀取資料讀取】
用法：store.get(STORAGE_KEY);
--------------------------------------------------------------------------------
底層原生代碼：
    const rawData = localStorage.getItem('myTodoList'); // 拿到的是「字串」
    const data = rawData ? JSON.parse(rawData) : null;  // 必須手動轉回「陣列」
備註：storejs 自動處理了 JSON.parse，避免了格式錯誤導致程式當機的問題。


【💥C、儲存資料到儲存】
用法：store.set(STORAGE_KEY, todoList);
--------------------------------------------------------------------------------
底層原生代碼：
    const jsonString = JSON.stringify(todoList);        // 必須手動把「陣列」轉為「字串」
    localStorage.setItem('myTodoList', jsonString);     // 寫入硬碟
備註：storejs 自動處理了 JSON.stringify，讓您可以直接把整份 todoList 陣列丟進去。


【💥D、F、G、H、I：持久化流程 (Persistence Flow)】
這些備註點代表了「資料生命週期管理」：
1. 網頁開啟 (DOMContentLoaded) -> 執行 loadFromStorage() -> 記憶體載入資料。
2. 任何資料變動 (Add/Delete/Toggle) -> 執行 saveToStorage() -> 硬碟同步資料。
3. 畫面更新 (render) -> 顯示最新狀態。

================================================================================
*/

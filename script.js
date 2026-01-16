let todoList = []; // 刷新，覆蓋假資料
let currentFilter = 'all';
let elements = {}; // 統一管理 DOM 元素

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

    // 初始化 DOM 元素（一次性抓取，避免重複查詢）
    elements = {
        input: document.getElementById('todoInput'),
        container: document.getElementById('todoListContainer'),
        statistics: document.getElementById('todoStatistics')
    };

    // 綁定事件
    bindEventById('addTodoBtn', 'click', function (e) {
        e.preventDefault();  // 防止連結跳轉
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

    // 事件委託：處理刪除和切換完成狀態（避免使用內聯 onclick）
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

    render();
});

// ⬇️function 區
function addTodo() {
    const text = elements.input.value.trim(); // 使用 elements，避免重複查詢

    if (text === "") {
        alert("請輸入內容");
        return;
    }

    const newTodo = {
        id: Date.now(), // 不顯示在畫面
        text: text,
        completed: false
    };

    todoList.unshift(newTodo);
    elements.input.value = "";
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

    // 遍歷，覆蓋先前html
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
        <!--複製 html 格式，把會改動的換成{}-->
    `).join("");
}

function toggleTodo(id) { // 改狀態
    const item = todoList.find(t => t.id === id);
    if (item) {
        item.completed = !item.completed;
        render();
    }
}

function deleteTodo(id) {
    if (confirm("確定要刪除該項目?")) {
        todoList = todoList.filter(t => t.id !== id);
        render();
    }
}

function clearCompleted() {
    if (confirm("確定要清除所有已完成項目嗎？")) {
        todoList = todoList.filter(t => !t.completed);
        render();
    }
}

function filterByStatus(status) {
    currentFilter = status;
    const tabs = document.querySelectorAll('.todoList_tab a');
    tabs.forEach(tab => tab.classList.remove('active'));

    // 使用 switch case 取代 if-else
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

    // 重新渲染畫面
    render();
}

// ⬆️function 區
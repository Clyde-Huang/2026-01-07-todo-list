let todoList = []; // 刷新，覆蓋假資料
let currentFilter = 'all'

document.addEventListener('DOMContentLoaded', function () {
    console.log('網頁載入完成!');

    const addBtn = document.querySelector('.inputBox a');
    if (addBtn) {
        addBtn.addEventListener('click', function (e) {
            e.preventDefault();  // 防止連結跳轉
            addTodo();
        });
    }

    const input = document.querySelector('.inputBox input');
    if (input) {
        input.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                addTodo();
            }
        });
    }

    const clearBtn = document.querySelector('.todoList_statistics a');
    if (clearBtn) {
        clearBtn.addEventListener('click', function (e) {
            e.preventDefault();
            clearCompleted();
        });
    }

    const tabs = document.querySelectorAll('.todoList_tab a');
    if (tabs.length > 0) {
        tabs[0].addEventListener('click', (e) => {
            e.preventDefault();
            filterByStatus('all');
        });
        tabs[1].addEventListener('click', (e) => {
            e.preventDefault();
            filterByStatus('uncompleted');
        });
        tabs[2].addEventListener('click', (e) => {
            e.preventDefault();
            filterByStatus('completed');
        });
    }

    render();
});

// ⬇️function 區
function addTodo() {
    const input = document.querySelector('.inputBox input');
    const text = input.value;

    if (text === "") {
        alert("請輸入內容")
        return;
    }

    const newTodo = {
        id: Date.now(), // 不顯示在畫面
        text: text,
        completed: false
    }

    todoList.unshift(newTodo);

    input.value = "";

    render();
}

function render() {
    const container = document.querySelector('.todoList_item');
    const statistics = document.querySelector('.todoList_statistics p');

    if (!container) { return; }

    let showList = todoList;
    if (currentFilter === 'completed') {
        showList = todoList.filter(item => item.completed === true);
    } else if (currentFilter === 'uncompleted') {
        showList = todoList.filter(item => item.completed === false);
    }

    const completedCount = todoList.filter(item => item.completed).length;
    statistics.textContent = `${completedCount} 個已完成項目`;

    if (showList.length === 0) {
        container.innerHTML = '<li style="text-align: center; padding: 20px; color: #9F9A91;">目前沒有待辦事項</li>';
        return;
    }

    // 遍歷，覆蓋先前html
    container.innerHTML = showList.map(item => `
         <li>
            <label class="todoList_label">
                <input class="todoList_input" type="checkbox" ${item.completed ? 'checked' : ''} onchange="toggleTodo(${item.id})">
                <span>${item.text}</span>
            </label>
            <a href="#" onclick="deleteTodo(${item.id}); return false;">
                <i class="fa fa-times"></i>
            </a>
        </li> 
        <!--複製 html 格式，把會改動的換成{}-->
        `).join("")
}

function toggleTodo(id) { // 改狀態
    const item = todoList.find(t => t.id === id);
    if (item) {
        item.completed = !item.completed;
        render();
    }
}

function deleteTodo(id) {
    if(confirm("確定要刪除該項目?")){
        todoList = todoList.filter(t => t.id !== id);
    }

    render();
}

function clearCompleted() {
    if (confirm("確定要清除所有已完成項目嗎？")) {
        todoList = todoList.filter(t => !t.completed);
        render()
    }
}

function filterByStatus(status) {

    currentFilter = status;
    const tabs = document.querySelectorAll('.todoList_tab a');
    tabs.forEach(tab => tab.classList.remove('active'));

    if (status === 'all') {
        tabs[0].classList.add('active');
    } else if (status === 'uncompleted') {
        tabs[1].classList.add('active');
    } else if (status === 'completed') {
        tabs[2].classList.add('active');
    }

    // 重新渲染畫面
    render();
}

// ⬆️function 區


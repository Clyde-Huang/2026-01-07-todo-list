let todoList = []; // 刷新，覆蓋假資料
let currentFilter = "all";
let elements = {};
let isLoading = false; // ✨載入狀態
const API_URL = "http://localhost:3000/todos"; // ✨API 基礎 URL

// 💥A、storejs 的 key 名稱（已改用 json-server，此變數可保留參考）
const STORAGE_KEY = "myTodoList";

// 📡1、建立 Broadcast Channel（用於多頁面同步)
// ****若是用 API 傳送資料就不是用 Broadcast Channel ****
const TODO_CHANNEL = new BroadcastChannel("todo-sync-channel");

// 💥B、從 localStorage 讀取資料（已改用 json-server，此函式可保留參考）
function loadFromStorage() {
  const data = store.get(STORAGE_KEY);
  if (data && Array.isArray(data)) {
    todoList = data;
    console.log("✅ 已從本地儲存載入資料:", todoList);
  } else {
    todoList = [];
    console.log("📝 本地儲存無資料，初始化空陣列");
  }
}

// 💥C、儲存資料到 localStorage（已改用 json-server，此函式可保留參考）
function saveToStorage() {
  store.set(STORAGE_KEY, todoList);
  console.log("💾 已儲存到本地:", todoList);

  // 📡3、通知其他頁面資料已更新
  TODO_CHANNEL.postMessage({
    action: "update",
    timestamp: Date.now()
  });
  console.log("📤 已廣播更新訊息給其他頁面");
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

document.addEventListener("DOMContentLoaded", function () {
  console.log("網頁載入完成!");

  // 初始化 DOM 元素
  elements = {
    input: document.getElementById("todoInput"),
    container: document.getElementById("todoListContainer"),
    statistics: document.getElementById("todoStatistics")
  };

  // 顯示載入中
  setLoading(true);

  // 💫 D、網頁載入時，先讀取 API 資料（已從 localStorage 改為 API）
  loadFromAPI().then(function () {
    // 渲染畫面
    render();
  });

  // 📡2、監聽來自其他頁面的廣播訊息
  TODO_CHANNEL.onmessage = function (event) {
    console.log("📡 收到其他頁面的更新訊息:", event.data);
    // 💫 重新從 API 讀取最新資料（已從 localStorage 改為 API）
    loadFromAPI().then(function () {
      render();
    });
  };

  // 綁定事件
  bindEventById("addTodoBtn", "click", function (e) {
    e.preventDefault();
    addTodo();
  });

  bindEventById("todoInput", "keypress", function (e) {
    if (e.key === "Enter") {
      addTodo();
    }
  });

  bindEventById("clearCompletedBtn", "click", function (e) {
    e.preventDefault();
    clearCompleted();
  });

  bindEventById("tabAll", "click", (e) => {
    e.preventDefault();
    filterByStatus("all");
  });

  bindEventById("tabUncompleted", "click", (e) => {
    e.preventDefault();
    filterByStatus("uncompleted");
  });

  bindEventById("tabCompleted", "click", (e) => {
    e.preventDefault();
    filterByStatus("completed");
  });

  // 事件委託：處理刪除和切換完成狀態
  // 💫 修正：直接使用字串 ID，不使用 parseInt
  elements.container.addEventListener("click", function (e) {
    const deleteBtn = e.target.closest(".delete-todo-btn");
    if (deleteBtn) {
      e.preventDefault();
      const todoId = deleteBtn.dataset.id; // 💫 直接使用字串，不用 parseInt
      deleteTodo(todoId);
    }
  });

  elements.container.addEventListener("change", function (e) {
    if (e.target.classList.contains("todoList_input")) {
      const todoId = e.target.dataset.id; // 💫 直接使用字串，不用 parseInt
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
  if (isLoading) {
    alert("處理中");
    return;
  }
  
  // 💫 F、新增待辦事項結構（json-server 會自動生成 ID）
  const newTodo = {
    // id: Date.now(), // 💫 不用這 id 了，json-server 會自動生成字串 ID
    text: text,
    completed: false
  };

  setLoading(true);

  // 💫 使用 fetch 發送 POST 請求到 API
  fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(newTodo)
  })
    .then(function (res) {
      if (!res.ok) {
        throw new Error("新增失敗，狀態碼: " + res.status);
      }
      return res.json();
    })
    .then(function (savedTodo) {
      console.log("✅ 新增成功:", savedTodo);

      // 💫 將新增的項目加入陣列（使用 API 回傳的完整資料，包含字串 ID）
      todoList.unshift(savedTodo);

      // 清空輸入框
      elements.input.value = "";

      render();

      // 📡 通知其他頁面資料已更新
      TODO_CHANNEL.postMessage({
        action: "update",
        timestamp: Date.now()
      });
    })
    .catch(function (error) {
      console.error("❌ 新增失敗:", error);
      alert("新增待辦事項失敗，請稍後再試");
    })
    .finally(function () {
      setLoading(false);
    });
  // 💥F、新增後儲存
  // saveToStorage(); // 💫 已改用 json-server API
}

function render() {
  if (!elements.container) return;

  let showList = todoList;

  switch (currentFilter) {
    case "completed":
      showList = todoList.filter((item) => item.completed === true);
      break;
    case "uncompleted":
      showList = todoList.filter((item) => item.completed === false);
      break;
    case "all":
    default:
      showList = todoList;
      break;
  }

  const completedCount = todoList.filter((item) => item.completed).length;
  elements.statistics.textContent = `${completedCount} 個已完成項目`;

  if (showList.length === 0) {
    elements.container.innerHTML = '<li class="no_todo">目前沒有項目</li>';
    return;
  }

  elements.container.innerHTML = showList
    .map(
      (item) => `
        <li>
            <label class="todoList_label">
                <input class="todoList_input" type="checkbox" ${item.completed ? "checked" : ""} data-id="${item.id}">
                <span>${item.text}</span>
            </label>
            <a href="#" class="delete-todo-btn" data-id="${item.id}">
                <i class="fa fa-times delBtn"></i>
            </a>
        </li>
    `
    )
    .join("");
}

function toggleTodo(id) {
  // 💫 使用字串 ID 尋找項目（json-server 的 ID 是字串）
  const item = todoList.find((t) => t.id === id);
  if (!item) return;

  if (isLoading) {
    alert("系統處理中，請稍候...");
    return;
  }

  // 💫 使用 PATCH 只需傳送要更新的欄位
  const updatedTodo = {
    completed: !item.completed
  };

  setLoading(true);

  // 💫 使用 fetch 發送 PATCH 請求到 API
  fetch(`${API_URL}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(updatedTodo)
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("更新失敗，狀態碼: " + response.status);
      }
      return response.json();
    })
    .then(function (updatedData) {
      console.log("✅ 更新成功:", updatedData);

      // 💫 更新本地陣列的資料
      const index = todoList.findIndex((t) => t.id === id);
      if (index !== -1) {
        todoList[index] = updatedData;
      }

      // 重新渲染畫面
      render();

      // 📡 通知其他頁面資料已更新
      TODO_CHANNEL.postMessage({
        action: "update",
        timestamp: Date.now()
      });
    })
    .catch(function (error) {
      console.error("❌ 更新失敗:", error);
      alert("更新待辦事項失敗，請稍後再試");

      // 💫 如果失敗，恢復原本的狀態
      item.completed = !item.completed;
    })
    .finally(function () {
      setLoading(false);
    });
}

function deleteTodo(id) {
  if (!confirm("確定要刪除該項目?")) {
    return;
  }

  setLoading(true);

  // 💫 使用 fetch 發送 DELETE 請求到 API
  fetch(`${API_URL}/${id}`, {
    method: "DELETE"
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("刪除失敗，狀態碼: " + response.status);
      }
      return response.json();
    })
    .then(function () {
      console.log("✅ 刪除成功");

      // 💫 從本地陣列中移除（使用字串 ID 比對）
      todoList = todoList.filter((t) => t.id !== id);

      // 重新渲染畫面
      render();

      // 📡 通知其他頁面資料已更新
      TODO_CHANNEL.postMessage({
        action: "update",
        timestamp: Date.now()
      });
    })
    .catch(function (error) {
      console.error("❌ 刪除失敗:", error);
      alert("刪除待辦事項失敗，請稍後再試");
    })
    .finally(function () {
      setLoading(false);
    });
}

function clearCompleted() {
  if (isLoading) {
    alert("處理中");
    return;
  }

  if (!confirm("確定要清除所有已完成項目嗎？")) {
    return;
  }

  // 💫 找出所有已完成項目的 ID（已是字串）
  const completedIds = todoList.filter((t) => t.completed).map((t) => t.id);

  if (completedIds.length === 0) {
    alert("沒有已完成項目可清除");
    return;
  }

  setLoading(true);

  // 💫 建立所有刪除請求的 Promise
  const deletePromises = completedIds.map(function (id) {
    return fetch(`${API_URL}/${id}`, {
      method: "DELETE"
    });
  });

  // 💫 等待所有刪除請求完成
  Promise.all(deletePromises)
    .then(function (responses) {
      // 檢查所有回應是否都成功
      const allSuccess = responses.every(function (response) {
        return response.ok;
      });

      if (!allSuccess) {
        throw new Error("部分項目清除失敗");
      }

      console.log("✅ 清除已完成項目成功");

      // 💫 更新本地陣列
      todoList = todoList.filter((t) => !t.completed);

      // 重新渲染畫面
      render();

      // 📡 通知其他頁面資料已更新
      TODO_CHANNEL.postMessage({
        action: "update",
        timestamp: Date.now()
      });
    })
    .catch(function (error) {
      console.error("❌ 清除失敗:", error);
      alert("清除已完成項目失敗，請稍後再試");
    })
    .finally(function () {
      setLoading(false);
    });
}

function filterByStatus(status) {
  currentFilter = status;
  const tabs = document.querySelectorAll(".todoList_tab a");
  tabs.forEach((tab) => tab.classList.remove("active"));

  switch (status) {
    case "all":
      tabs[0].classList.add("active");
      break;
    case "uncompleted":
      tabs[1].classList.add("active");
      break;
    case "completed":
      tabs[2].classList.add("active");
      break;
  }

  render();
}

// 💫 控制 Loading 狀態的函式
function setLoading(state) {
  // 1. 更新全域的 isLoading 狀態
  isLoading = state;

  // 2. 取得需要控制的 DOM 元素
  const addBtn = document.getElementById("addTodoBtn");
  const input = document.getElementById("todoInput");

  // 3. 如果元素存在，就更新它們的狀態
  if (addBtn && input) {
    if (state) {
      // 🔴 狀態為 true：顯示「載入中」

      // 將 + 按鈕改為旋轉的載入圖示
      addBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';

      // 禁用按鈕，防止重複點擊
      addBtn.disabled = true;

      // 禁用輸入框，防止輸入新項目
      input.disabled = true;
    } else {
      // 🟢 狀態為 false：恢復正常

      // 將載入圖示改回 + 號
      addBtn.innerHTML = '<i class="fa fa-plus"></i>';

      // 啟用按鈕
      addBtn.disabled = false;

      // 啟用輸入框
      input.disabled = false;
    }
  }

  // 4. 更新待辦事項列表區域的顯示（可選）
  const container = document.getElementById("todoListContainer");
  if (container && state) {
    // 如果正在載入，顯示「載入中...」訊息
    container.innerHTML = '<li class="no_todo">載入中...</li>';
  }
}

// 💫 從 API 讀取資料的函式
function loadFromAPI() {
  console.log("🔍 從 API 讀取資料...");
  setLoading(true);

  return fetch(API_URL)
    .then(function (response) {
      // 檢查回應是否成功
      if (!response.ok) {
        throw new Error("網路回應不正常，狀態碼: " + response.status);
      }
      return response.json(); // 解析 JSON
    })
    .then(function (data) {
      todoList = data;
      console.log("✅ 已從 API 載入資料:", todoList);
      return todoList;
    })
    .catch(function (error) {
      console.error("❌ 載入資料失敗:", error);
      alert(
        "無法載入待辦事項，請檢查伺服器是否啟動\n\n執行指令: npm run server"
      );
      todoList = [];
      return [];
    })
    .finally(function () {
      setLoading(false);
    });
}
// ⬆️function 區

/* 
================================================================================
💥 storejs 套件 vs. json-server API 對照表 💥
================================================================================

【💫 D、從讀取資料】
原本：store.get(STORAGE_KEY); // 本地儲存
現在：fetch(API_URL).then(res => res.json()); // API 請求

【💫 F、新增資料】
原本：todoList.unshift(newTodo); saveToStorage();
現在：fetch(API_URL, {method: 'POST', body: JSON.stringify(newTodo)})

【💫 G、更新資料】
原本：item.completed = !item.completed; saveToStorage();
現在：fetch(`${API_URL}/${id}`, {method: 'PATCH', body: JSON.stringify(updatedTodo)})

【💫 H、刪除資料】
原本：todoList = todoList.filter(t => t.id !== id); saveToStorage();
現在：fetch(`${API_URL}/${id}`, {method: 'DELETE'})

【重要差異】
1. ID 類型：json-server 使用字串 ID ("ce52")，原本使用數字 ID
2. 非同步處理：API 需要處理 Promise (.then/.catch)
3. 錯誤處理：需要處理網路錯誤和伺服器錯誤
4. Loading 狀態：API 請求期間需要顯示載入狀態

================================================================================
*/
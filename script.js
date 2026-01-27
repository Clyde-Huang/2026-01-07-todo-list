let todoList = []; // 刷新，覆蓋假資料
let currentFilter = "all";
let elements = {};
let isLoading = false; // ✨載入狀態
const API_URL = "http://localhost:3000/todos"; // ✨API 基礎 URL

// 💥A、storejs 的 key 名稱（已改用 json-server，此變數可保留參考）
const STORAGE_KEY = "myTodoList";

// 📡1、建立 Broadcast Channel（用於多頁面同步)
const TODO_CHANNEL = new BroadcastChannel("todo-sync-channel");

// 🔧 生成唯一的頁面 ID，用於識別自己發出的廣播
const PAGE_ID =
  "page_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

// 🔧 記錄最後一次操作的時間戳，用於防止重複刷新
let lastOperationTime = 0;

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
    timestamp: Date.now(),
    pageId: PAGE_ID // 🔧 加上頁面 ID
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

  // 📡2、監聽來自其他頁面的廣播訊息 - **修正後的處理**
  TODO_CHANNEL.onmessage = function (event) {
    console.log("📡 [DEBUG] 收到廣播:", {
      eventPageId: event.data.pageId,
      myPageId: PAGE_ID,
      isSelf: event.data.pageId === PAGE_ID
    });

    // 🔧 **策略1：如果是自己發出的廣播，就完全忽略**
    if (event.data.pageId === PAGE_ID) {
      console.log("📡 忽略自己發出的廣播訊息（策略1）");
      return;
    }

    // 🔧 **策略2：如果距離上次操作時間太近（300ms內），也忽略**
    const now = Date.now();
    if (now - lastOperationTime < 300) {
      console.log("📡 距離上次操作太近，忽略此次廣播（策略2）");
      return;
    }

    console.log("📡 收到其他頁面的更新訊息，重新載入資料...");

    // 💫 重新從 API 讀取最新資料（已從 localStorage 改為 API）
    setLoading(true);
    fetch(API_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("網路回應不正常，狀態碼: " + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        todoList = data;
        console.log("✅ 已從 API 同步最新資料:", todoList);
        render();
      })
      .catch(function (error) {
        console.error("❌ 同步資料失敗:", error);
      })
      .finally(function () {
        setLoading(false);
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
  elements.container.addEventListener("click", function (e) {
    const deleteBtn = e.target.closest(".delete-todo-btn");
    if (deleteBtn) {
      e.preventDefault();
      const todoId = deleteBtn.dataset.id;
      deleteTodo(todoId);
    }
  });

  elements.container.addEventListener("change", function (e) {
    if (e.target.classList.contains("todoList_input")) {
      const todoId = e.target.dataset.id;
      toggleTodo(todoId);
    }
  });
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

      // 🔧 記錄操作時間
      lastOperationTime = Date.now();

      // 💫 將新增的項目加入陣列
      todoList.push(savedTodo);

      // 清空輸入框
      elements.input.value = "";

      // **修正：先渲染，再發送廣播**
      render();

      // 📡 通知其他頁面資料已更新
      setTimeout(() => {
        TODO_CHANNEL.postMessage({
          action: "update",
          timestamp: Date.now(),
          pageId: PAGE_ID
        });
        console.log("📤 已發送廣播通知其他頁面");
      }, 100); // 稍微延遲，確保渲染完成
    })
    .catch(function (error) {
      console.error("❌ 新增失敗:", error);
      alert("新增待辦事項失敗，請稍後再試");
    })
    .finally(function () {
      setLoading(false);
    });
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
  const item = todoList.find((t) => t.id === id);
  if (!item) return;

  if (isLoading) {
    alert("系統處理中，請稍候...");
    return;
  }

  const updatedTodo = {
    completed: !item.completed
  };

  setLoading(true);

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

      lastOperationTime = Date.now();

      const index = todoList.findIndex((t) => t.id === id);
      if (index !== -1) {
        todoList[index] = updatedData;
      }

      // **修正：先渲染，再發送廣播**
      render();

      setTimeout(() => {
        TODO_CHANNEL.postMessage({
          action: "update",
          timestamp: Date.now(),
          pageId: PAGE_ID
        });
        console.log("📤 已發送廣播通知其他頁面");
      }, 100);
    })
    .catch(function (error) {
      console.error("❌ 更新失敗:", error);
      alert("更新待辦事項失敗，請稍後再試");
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

      lastOperationTime = Date.now();

      todoList = todoList.filter((t) => t.id !== id);

      // **修正：先渲染，再發送廣播**
      render();

      setTimeout(() => {
        TODO_CHANNEL.postMessage({
          action: "update",
          timestamp: Date.now(),
          pageId: PAGE_ID
        });
        console.log("📤 已發送廣播通知其他頁面");
      }, 100);
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

  const completedIds = todoList.filter((t) => t.completed).map((t) => t.id);

  if (completedIds.length === 0) {
    alert("沒有已完成項目可清除");
    return;
  }

  setLoading(true);

  const deletePromises = completedIds.map(function (id) {
    return fetch(`${API_URL}/${id}`, {
      method: "DELETE"
    });
  });

  Promise.all(deletePromises)
    .then(function (responses) {
      const allSuccess = responses.every(function (response) {
        return response.ok;
      });

      if (!allSuccess) {
        throw new Error("部分項目清除失敗");
      }

      console.log("✅ 清除已完成項目成功");

      lastOperationTime = Date.now();

      todoList = todoList.filter((t) => !t.completed);

      // **修正：先渲染，再發送廣播**
      render();

      setTimeout(() => {
        TODO_CHANNEL.postMessage({
          action: "update",
          timestamp: Date.now(),
          pageId: PAGE_ID
        });
        console.log("📤 已發送廣播通知其他頁面");
      }, 100);
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
  isLoading = state;

  const addBtn = document.getElementById("addTodoBtn");
  const input = document.getElementById("todoInput");

  if (addBtn && input) {
    if (state) {
      addBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
      addBtn.disabled = true;
      input.disabled = true;
    } else {
      addBtn.innerHTML = '<i class="fa fa-plus"></i>';
      addBtn.disabled = false;
      input.disabled = false;
    }
  }

  const container = document.getElementById("todoListContainer");
  if (container && state) {
    container.innerHTML = '<li class="no_todo">載入中...</li>';
  }
}

// 💫 從 API 讀取資料的函式
function loadFromAPI() {
  console.log("🔍 從 API 讀取資料...");
  setLoading(true);

  return fetch(API_URL)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("網路回應不正常，狀態碼: " + response.status);
      }
      return response.json();
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
💥 主要修正說明 💥
================================================================================

【問題原因】
1. 當你在某個頁面進行操作（如新增待辦事項）
2. 操作完成後，先更新本地資料並渲染
3. 然後發送廣播通知其他頁面
4. **問題點**：發送廣播的頁面自己也會收到這個廣播，然後又去API重新載入資料，導致二次渲染

【解決方案 - 雙重防護】
1. **策略1：pageId 識別**
   - 每個頁面生成唯一ID
   - 發送廣播時帶上自己的pageId
   - 收到廣播時，如果pageId與自己相同，就忽略

2. **策略2：時間戳防抖**
   - 記錄最後一次操作的時間
   - 如果收到廣播的時間距離上次操作太近（300ms內），就忽略
   - 這是為了防止快速連續操作導致的重複刷新

3. **策略3：廣播延遲發送**
   - 在操作完成並渲染後，延遲100ms再發送廣播
   - 確保本地渲染完成後才通知其他頁面

【修正後的流程】
操作完成 → 本地渲染 → 延遲100ms → 發送廣播 → 其他頁面收到 → 重新載入API → 渲染
                    ↑
                不會收到自己的廣播

================================================================================
*/

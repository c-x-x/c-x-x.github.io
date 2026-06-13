+++
title = 'JavaScript 异步编程指南'
date = '2026-06-12T10:00:00+08:00'
draft = false
categories = ['技术', 'JavaScript']
tags = ['JavaScript', 'Promise', 'Async/Await', '异步编程']
description = '深入理解 JavaScript 中的异步编程，从回调函数到 Promise 再到 Async/Await。'
+++

## JavaScript 异步编程概述

JavaScript 是单线程语言，但通过异步编程可以实现非阻塞操作。

### 1. 回调函数 (Callbacks)

最早的异步处理方式：

```javascript
function fetchData(callback) {
  setTimeout(() => {
    callback('数据已加载');
  }, 1000);
}

fetchData((data) => {
  console.log(data);
});
```

**问题：** 回调地狱 (Callback Hell)

### 2. Promise

Promise 解决了回调地狱问题：

```javascript
function fetchData() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve('数据已加载');
    }, 1000);
  });
}

fetchData()
  .then(data => console.log(data))
  .catch(error => console.error(error));
```

### 3. Async/Await

更加优雅的异步代码：

```javascript
async function loadData() {
  try {
    const data = await fetchData();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

loadData();
```

### 实际应用示例

```javascript
// 并行请求多个 API
async function fetchAllData() {
  const [users, posts, comments] = await Promise.all([
    fetch('/api/users').then(r => r.json()),
    fetch('/api/posts').then(r => r.json()),
    fetch('/api/comments').then(r => r.json())
  ]);

  return { users, posts, comments };
}
```

### 总结

- 使用 Promise 避免回调地狱
- Async/Await 让异步代码更易读
- Promise.all 实现并行请求
- 记得处理错误情况

异步编程是 JavaScript 的核心特性，掌握它对于前端开发至关重要！


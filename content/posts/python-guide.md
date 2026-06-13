+++
title = 'Python 装饰器完全指南'
date = '2026-06-11T15:30:00+08:00'
draft = false
categories = ['技术', 'Python']
tags = ['Python', '装饰器', '高级特性']
description = 'Python 装饰器从基础到高级，理解装饰器的本质和实际应用场景。'
+++

## 什么是装饰器？

装饰器是 Python 中的一种高级特性，本质上是一个返回函数的函数。

### 基础装饰器

```python
def my_decorator(func):
    def wrapper():
        print("Something before the function")
        func()
        print("Something after the function")
    return wrapper

@my_decorator
def say_hello():
    print("Hello!")

say_hello()
```

### 带参数的装饰器

```python
def my_decorator(func):
    def wrapper(*args, **kwargs):
        print(f"调用函数: {func.__name__}")
        result = func(*args, **kwargs)
        print("函数执行完毕")
        return result
    return wrapper

@my_decorator
def add(a, b):
    return a + b

result = add(3, 5)
print(f"结果: {result}")
```

### 保留函数元信息

使用 `functools.wraps` 保留原函数的元信息：

```python
from functools import wraps

def my_decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        """Wrapper function"""
        return func(*args, **kwargs)
    return wrapper
```

### 总结

装饰器让代码更加优雅和可复用，是 Python 的核心特性之一！


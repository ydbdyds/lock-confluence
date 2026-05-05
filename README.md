# Confluence Edit Lock

修复 Confluence 经典编辑器在 Chromium 浏览器上「点击空白处页面跳回顶部」的 bug。

## 功能

- 在 Confluence 编辑页自动启用,消除点击边缘空白时页面跳到顶部的问题
- 页面右上角显示红色 🔒 EDIT-LOCK 角标作为生效指示
- 工具栏图标提供「自动 / 强制开 / 强制关」三态切换

不在编辑页时不做任何事;非 `*confluence*` 域名上不注入。

## 支持的浏览器

- Chrome 88+
- Edge 88+
- 其他 Chromium 内核浏览器(Brave / Arc / Vivaldi / Opera 等)

Firefox / Safari 没有这个 bug,不需要装。

## 安装

```bash
git clone https://github.com/ydbdyds/lock-confluence.git
```

1. 打开 `chrome://extensions`(Edge 是 `edge://extensions`)
2. 右上角打开「开发者模式」
3. 点「加载已解压扩展程序」,选择克隆下来的目录

打开 Confluence 编辑页,看到右上角红色 🔒 角标即表示生效。

## License

MIT

# Confluence Edit Lock

[English](./README.md) | **简体中文**

修复 Confluence 经典编辑器在 Chromium 浏览器上「点击空白处页面跳回顶部」的 bug。

## 功能

- 在 Confluence 编辑页自动启用,消除点击边缘空白时页面跳到顶部的问题
- 工具栏图标提供「自动 / 强制开 / 强制关」三态切换,图标上的 `ON` 角标表示当前页已激活

不在编辑页时不做任何事;非 `*confluence*` 域名上不注入。

## 适用范围

这个 bug 出现在使用**经典 TinyMCE 编辑器**(嵌在 `<iframe id="wysiwygTextarea_ifr">` 里的那个)的 Confluence Server / Data Center,且只在 Chromium 内核浏览器上触发。

- **受影响**:Confluence Server / DC **9.2.11 之前**以及 **10.1.0 之前**的版本——Atlassian 已在这两个版本中官方修复 ([CONFSERVER-100547](https://jira.atlassian.com/browse/CONFSERVER-100547))
- **不受影响**:Confluence Cloud(使用新的 Atlaskit 编辑器)、Confluence DC 9.2.11+ / 10.1.0+,以及非 Chromium 浏览器(Firefox / Safari 本身就没这个 bug)

如果你的实例已经升级到修复版本,不需要装这个扩展。

## 自动模式匹配规则

只有**同时满足**以下两个条件时才会激活:

1. 域名包含子串 `confluence`(大小写不敏感)。命中示例:`confluence.company.com`、`pdconfluence.example.com`、`wiki.confluence.internal`。不命中示例:`wiki.company.com`、`kb.team.io`。
2. URL 看起来像编辑页 **并且** 页面上存在编辑器 DOM 节点。

URL 满足下列任一条件即视为编辑页:

- `resumedraft.action`(恢复草稿)
- `?action=edit` 或 `&action=edit`(经典编辑 URL)
- `/edit-v2/`(新版编辑路由)
- `/pages/editpage.action`
- `/pages/createpage.action`

编辑器 DOM 探测会寻找以下任一节点:`iframe#wysiwygTextarea_ifr`、`iframe.tox-edit-area__iframe`、`.ProseMirror`、`[contenteditable='true']`。

如果你公司的 Confluence 域名不含 `confluence` 字样(比如自定义的 `wiki.company.com`),自动模式不会触发——请通过工具栏弹窗里的「**强制开**」手动启用。

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

打开 Confluence 编辑页,工具栏扩展图标出现 `ON` 角标即表示生效。

## License

MIT

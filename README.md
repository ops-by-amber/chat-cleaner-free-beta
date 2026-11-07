# Chat Cleaner — Free Beta

Free Chrome extension for selecting several chats at once in the ChatGPT sidebar and archiving or deleting them through ChatGPT's existing controls. Independent project; **not affiliated with or endorsed by OpenAI**.

## Download

**[Download Chat Cleaner Free Beta v1.6.1](https://github.com/ops-by-amber/chat-cleaner-free-beta/raw/refs/heads/main/downloads/chat-cleaner-free-beta-v1.6.1.zip)**

Version 1.6.1 fixes missing checkboxes on **custom GPT conversations** (the `/g/...` links) while retaining standard `/c/...` chat support.

This fixed ZIP is stored directly in the public repository under [downloads/](downloads/). The earlier v1.6.0 GitHub Release is superseded. Do **not** select GitHub's automatically generated “Source code (zip)” file.

**Beta status:** software is still being tested. Try it with one disposable chat first. Delete actions cannot be undone.

## Installation (free — no Chrome Web Store registration)

1. Download `chat-cleaner-free-beta-v1.6.1.zip` and **extract** it.
2. Open Chrome and enter `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Choose **Load unpacked**.
5. Select the extracted folder containing `manifest.json`.
6. Refresh `https://chatgpt.com`.
7. Click the blue **Chat Cleaner** button in the lower-right corner of ChatGPT.
8. Turn on **Show checkboxes in sidebar**, select chats, then Archive or Delete.

See **[detailed installation instructions](INSTALL.md)** and [privacy information](PRIVACY.md).

## Features

- Checkboxes beside currently loaded standard chat and custom GPT conversation links; GPT landing pages and folder headings are excluded.
- Filter by chat title and select matching chats.
- Confirmed bulk Archive or Delete, processed one chat at a time.
- Stop safely when a menu or confirmation is unrecognized.
- Optional local import of `conversations.json` for content/date searches.
- Optional quick **Worked / Had an issue / Suggestion** feedback after a batch, with a short comment. Feedback only sends if you click a response.

## Limits and known issues

- ChatGPT may load only part of your chat history in the sidebar; scroll the left sidebar to load more. This version recognizes both standard and custom GPT conversation URLs.
- Folders/project headings are not selectable as conversations.
- A chat disappearing from the sidebar does **not** independently prove server-side deletion.
- ChatGPT interface changes may break batch processing. The extension stops on uncertainty.
- Beta feedback is forwarded through FormSubmit to the developer's GitHub email, **ops.by.amber@gmail.com**. Email delivery is pending recipient activation and verification; use direct email as a fallback.

## Feedback and support

If something fails, open **Operation details**, copy the sanitized log, and send a report to **ops.by.amber@gmail.com**. You may also [open a GitHub issue](https://github.com/ops-by-amber/chat-cleaner-free-beta/issues/new) (GitHub sign-in required). Please don't include private chats or personal information.

There is **no payment**, license-key requirement, or subscription for this beta.

## Development

This public repository contains beta downloads, instructions, and support information. Development and tests are maintained separately in a private repository. The installable ZIP necessarily contains the extension's JavaScript, CSS and icons, as all unpacked Chrome extensions do.

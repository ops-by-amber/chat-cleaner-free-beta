# Install Chat Cleaner Free Beta

**Supported:** desktop Google Chrome and the current ChatGPT website. **Price:** free.

### Download and install

1. Download **[Chat Cleaner Free Beta v1.6.1](https://github.com/ops-by-amber/chat-cleaner-free-beta/raw/refs/heads/main/downloads/chat-cleaner-free-beta-v1.6.1.zip)** from the public repository. This is the updated ZIP with the custom GPT checkbox fix.
2. Do not download GitHub's automatic “Source code (zip)” file; choose the linked Chrome extension ZIP instead.
3. Right-click the downloaded ZIP and select **Extract All** (Windows) or double-click to extract (macOS).
4. Open Chrome and enter `chrome://extensions` into the address bar.
5. Switch **Developer mode** on (top right).
6. Select **Load unpacked**.
7. Open the extracted directory that directly contains `manifest.json`. Click **Select folder**.
8. Disable/remove older Chat Cleaner versions so buttons don't appear twice.
9. Open or refresh `https://chatgpt.com`; click **Chat Cleaner** in the bottom-right corner.
10. Click **Show checkboxes in sidebar** and test Archive/Delete on **one disposable conversation**.

The ZIP must be **extracted** before selecting Load unpacked. Keep the extracted folder on disk after installation.

### How to use it

Check conversations in the ChatGPT sidebar, optionally filter by title, then choose **Archive** or **Delete**. Review the confirmation and follow the deletion prompt. A batch stops on unrecognized menus or confirmation dialogs. **Never blindly retry the entire previous batch** after an error: verify which chats remain.

To view older chats, scroll within the *left sidebar*, not the main chat window. Content and historical date filtering require you to import your ChatGPT `conversations.json` export locally.

### Updating the beta

Download the replacement beta ZIP when announced, extract it, then update the installed unpacked folder. Return to `chrome://extensions` and click the extension's reload icon. GitHub-installed unpacked extensions **do not automatically update** like Chrome Web Store extensions.

### Problems

- **No Chat Cleaner button:** confirm Chrome enabled the extension and refresh ChatGPT.
- **Checkboxes absent:** open the Chat Cleaner panel and enable **Show checkboxes in sidebar**.
- **Only some chats selectable:** Install v1.6.1, refresh ChatGPT and reopen Chat Cleaner. This version supports standard and custom GPT conversation links. Older chats still need to load in the sidebar; scroll the left sidebar. Folder and project headings remain excluded.
- **Batch stops:** open **Operation details** and copy the sanitized log. Don't rerun a large batch without checking what was already removed.
- **Feedback won't send:** try the direct email link or email **ops.by.amber@gmail.com**. FormSubmit still needs recipient activation and a verified live test.
- **Can't load extension:** choose the folder containing `manifest.json`, not the ZIP or its parent directory.

### Safety

Deleting conversations is permanent. The extension uses ChatGPT's website controls and reports what disappears from the sidebar, **not independent server-side verification**. No account password is requested by the extension. Do not share sensitive chat contents in feedback or issue reports.

[Privacy information](PRIVACY.md) · [Report a problem](https://github.com/ops-by-amber/chat-cleaner-free-beta/issues/new)

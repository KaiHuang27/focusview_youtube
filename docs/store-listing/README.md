# Chrome Web Store 商品說明

商品 ID：`jbdndcjclbghkmbiehjigaapembpbgdb`。

五份 UTF-8 純文字檔供開發者後台各語言的完整「說明」欄位使用：

| 語言 | 檔案 |
| --- | --- |
| 英文 | en.txt |
| 繁體中文 | zh-TW.txt |
| 簡體中文 | zh-CN.txt |
| 日文 | ja.txt |
| 韓文 | ko.txt |

英文以目前公開商店說明為基準，其他版本翻譯相同的功能、使用情境及隱私聲明。只處理完整商品說明；名稱與擴充功能介面不變。Chrome 1.1.7 新增 `_locales` 與本地化簡短摘要以啟用後台語系；完整說明文件不包含在安裝包中。

## 套用與驗證

1. 登入 Chrome Web Store 開發者後台並選擇上述商品。
2. 在商店資訊頁檢查可用語言，依序選擇或新增上述五種語言，將對應文字貼入完整說明欄位。
3. 上傳 1.1.7 安裝包後，確認五種語系均可選取。
4. 儲存後逐一切換語言，確認內容未被覆寫，再依後台流程送審。
5. 生效後以各語言的公開商店頁確認顯示內容。

狀態（2026-10-18）：1.1.7 已上傳，五種語言說明已儲存並逐一確認，已提交審查，後台顯示「待審查」。發布模式為通過後暫存（STAGED_PUBLISH），不會自動公開；通過後須於 30 天內發布。公開版本目前仍為 1.1.6。

- 測試：108 項通過，包含語系資料解析、摘要長度、完整說明功能一致性與 ZIP 語系檔封裝檢查。
- 程式提交：`aad59cd`。
- 安裝包：`dist/focusview-1.1.7.zip`。
- SHA-256：`6fd33983746a950ed30273de6cc5913652e8fb8b8531b9880f323582f9b1a15a`。
- 隱私政策：https://sites.google.com/view/focusview-privacy-policy 。後台既有不蒐集資料聲明、YouTube 網站存取理由、免費與所有區域公開設定均維持原狀。
- 英文完整說明不重複套件摘要，避免公開頁面首句重複。
- Safari 僅同步本地版本 1.1.7／build 8，未上傳或提交 Apple 審查。
- 送審畫面：[submitted-2026-10-18.png](submitted-2026-10-18.png)。

官方說明：https://developer.chrome.com/docs/webstore/cws-dashboard-listing

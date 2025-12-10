## Plan: 上一組自動帶入（Auto-fill 上一次）

在 `WorkoutPage` 利用現有的 `sets` 狀態，每次選擇動作或新增完一組後，自動把該動作「上一組」的重量/次數/時間/距離帶入表單，減少輸入時間，同時避免覆蓋使用者已經手動輸入的值。

### Steps
1. 在 `WorkoutPage` 中新增一個小工具函式（檔內）：從 `sets` 依 `exerciseId` 過濾並按時間/ID 取「最後一組」，回傳對應的 `SetRecord`（可優先選非熱身組，若沒有則退而求其次）。
2. 在 `selectedExerciseId` 變更時（`onChange` 或用 `useEffect` 監聽），如果目前 `weight/reps/duration/distance` 都是空字串，就從該動作的最後一組帶入欄位值（有值才填，沒有的保持空白），並視需求同步預設 `isWarmup`。
3. 在 `handleAddSet` 新增一組成功後、重新取得 `sets` 並 `setSets` 之後，呼叫同一個「帶入上一組」邏輯，讓下一組預設就是剛才那一組的數值，配合現有休息倒數。
4. 確保自動帶入不會覆蓋使用者已輸入的內容：只要任一欄位已有非空值，就不要再自動改變；同時避免在 `useEffect` 依賴過多 state 造成不必要的重複觸發。

### Further Considerations
1. 是否需要設定開關：可在 `Settings` 新增「自動帶入上一組」布林選項，讓不喜歡的人關閉；若不急可以先跳過，預設開啟體驗最好。

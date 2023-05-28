import { configureStore } from "@reduxjs/toolkit";
import cursorReducer from "./slices/cursorSlice";


const store = configureStore({
    reducer: {
        cursor: cursorReducer,
    }
}
)

export type RootState = ReturnType<typeof store.getState>
export default store;
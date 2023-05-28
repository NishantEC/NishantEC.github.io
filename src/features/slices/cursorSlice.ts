import { createSlice } from "@reduxjs/toolkit"


const initialState = {
    cords:{
        x:0,
        y:0
    },
    variant: 'default'
}

const cursorSlice = createSlice({
    name: 'cursor',
    initialState,
    reducers: {
        setCursorCords: (state, action) => {
            state.cords = action.payload
        },
        setCursorVariant: (state, action) => {
            state.variant = action.payload
        }
    }
})

export const { setCursorCords } = cursorSlice.actions

export default cursorSlice.reducer
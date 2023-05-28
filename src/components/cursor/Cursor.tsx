import { motion } from 'framer-motion'
import React from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../features/store'




function Cursor () {
  const {cords} = useSelector((state: RootState) => state.cursor)

  const cursorVariants = {
    hidden: {

      width: "30px",
      height: "30px",
      // border: "1px solid black",
      borderRadius: "50%",
      transition: {
        type: "spring",
        mass: 0.6
      }

    },
    visible: {

      width: "30px",
      height: "30px",
      // border: "2px solid black",
      borderRadius: "50%",
      x: cords.x-10,
      y: cords.y-10,
      backgroundColor: "#ffffff00"

    },
    // hover:{
    //   width: "30px",
    //   height: "30px",
    //   x: cords.x-5,
    //   y: cords.y-5,
    //   border: "1px solid black",
    //   borderRadius: "50%",
    //   backgroundColor: "#ffffff00",
    //   filter: "bl"

    // }
  }
  return (
    <motion.div
    style={{
      position:'fixed',
      zIndex: 1000,
      pointerEvents: "none",
      // transitionDelay: "0.1s",
    }}

    animate={cursorVariants.visible}
    transition={{
      type: "spring",
      mass: 0.6,
      delay:-0.0125,
      damping: 100,
      stiffness: 1000,
    }}

   >

<svg 
    style={{

      zIndex: 1000,
      pointerEvents: "none",
      height: "30px",
      width: "30px",


    }}



width="30px" height="30px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8.68602 16.288L8.10556 9.37387C7.96399 7.68752 9.85032 6.59846 11.24 7.56424L16.9375 11.524C18.6256 12.6972 17.6579 15.348 15.611 15.1577L14.8273 15.0849C13.9821 15.0063 13.1795 15.4697 12.825 16.2409L12.4962 16.9561C11.6376 18.8238 8.858 18.3365 8.68602 16.288Z" stroke="#323232" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
    </motion.div>
  )
}


export default Cursor

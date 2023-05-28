import { useEffect, useRef, useState } from "react";

import "./App.scss";
import Cursor from "./components/cursor/Cursor";

import { useDispatch } from "react-redux";
import { setCursorCords } from "./features/slices/cursorSlice";
import Navbar from "./components/navbar/Navbar";
import Hero from "./components/hero/Hero";
import Projects from "./components/projects/Projects";
import About from "./components/about/About";
import { AnimatePresence, motion, useInView } from "framer-motion";
import Loader from "./components/loader/Loader";
import Footer from "./components/footer/Footer";
import ContactForm from "./components/contact/Contact";

function App() {
  const dispatch = useDispatch();
  const [isItLoading, setIsItLoading] = useState(true)
  useEffect(() => {
    setTimeout(() => {
      setIsItLoading(false)
    }, 2000);
  
  }, [])
  
const heroRef = useRef(null)

const isHeroInView = useInView(heroRef)
  return (
    <div
      className="App"
      onMouseMove={(e) =>
        dispatch(
          setCursorCords({
            x: e.clientX,
            y: e.clientY,
          })
        )
      }
    >
      <Cursor />
      <AnimatePresence>
      {isItLoading ? <Loader/>: 
      <>
      <div className="App-wrapper">
        <Navbar isHeroInView={isHeroInView} />
        <div ref={heroRef}>
        <Hero />
        </div>
        <About/>
        <Projects />
        <ContactForm/>
        <Footer/>
      </div>

      
        <motion.div     layoutId='loader-wrapper' className="blob-cont loading">
        <motion.div layoutId='yellow-blob' className="yellow blob"></motion.div>
        <motion.div layoutId='red-blob' className="red blob"></motion.div>
        <motion.div layoutId='blue-blob' className="blue blob"></motion.div>
      </motion.div>
      </>
}
      </AnimatePresence>

    </div>
  );
}

export default App;

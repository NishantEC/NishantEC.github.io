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
    }, 3000);
  
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

      {isItLoading ? <Loader/>: null}

      </AnimatePresence>
      <div className="App-wrapper"
      style={{opacity: isItLoading ? 0 : 1}}
      >
        <Navbar isHeroInView={isHeroInView} />
        <div ref={heroRef}>
        <Hero />
        </div>
        <About/>
        <Projects />
        <ContactForm/>
        <Footer/>
      </div>      
        <div 
        className="blob-cont loading">
        <div className="yellow blob"></div>
        <div  className="red blob"></div>
        <div className="blue blob"></div>
      </div>



    </div>
  );
}

export default App;

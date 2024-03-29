import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import "./loader.scss";

const Loader = () => {
  const hellos = [
    "Hello", // English
    "नमस्ते", // Hindi
    "Hola", // Spanish
    "Bonjour", // French
    "Ciao", // Italian
    "Olá", // Portuguese
    "નમસ્તે", // Gujarati
    "हॅलो", // Marathi
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % hellos.length);
    }, 1200);

    return () => clearInterval(interval);
  }, []);
  return (
    <motion.div
      className="loader-wrapper"
      initial={{ opacity: 1, 
        height: "100vh" }}
      animate={{ opacity: 1, 
        height: "100vh",
        y: "0vh"
      }}
      exit={{ opacity: 1,
         height: "50vh",
         y: "100vh" }}
      transition={{
        duration: 1,
        

        ease: "easeInOut",
      }}
    >
      <motion.div
        className="loader"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.1,
          delay: 0.5,
          ease: "easeInOut",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            className="loader-hello"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{
              duration: 0.5,
            }}
          >
            {hellos[index]}
          </motion.span>
        </AnimatePresence>
        {/* <div className="blobs">
          <motion.div
            layoutId="yellow-blob"
            className="blob yellow"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0], x: [-100, 0, 100] }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          />
          <motion.div
            layoutId="red-blob"
            className="blob red"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0], x: [-100, 0, 100] }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0.5,
            }}
          />
          <motion.div
            layoutId="blue-blob"
            className="blob blue"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0], x: [-100, 0, 100] }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 1.25,
            }}
          />
        </div> */}
      </motion.div>
    </motion.div>
  );
};

export default Loader;

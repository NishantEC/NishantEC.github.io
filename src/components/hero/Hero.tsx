import React from "react";
import "./hero.scss";
import pfpImg from "../../assets/me.jpeg";
import { motion } from "framer-motion";

function Hero({ref}:any) {
  return (
    <div className="hero-container" ref={ref}>
      <div className="hero-wrapper">
        

          <div className="hero-content">
            <div className="title">
              {" "}
              <motion.span
                className="name-title"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  duration: 0.5,
                  delay: 0.2,
                }}
              >
                Hello! I am
              </motion.span>
              <motion.span
                className="name"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  duration: 0.5,
                  delay: 0.2,
                }}
              >
                Nishant Gupta
              </motion.span>
              <motion.span
                className="separetor"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  duration: 0.5,
                  delay: 0.3,
                }}
              ></motion.span>
              <motion.span
                className="work-title"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  duration: 0.5,
                  delay: 0.4,
                }}
              >
                Frontend Developer
              </motion.span>
            </div>
            
            <motion.div className="heading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              type: "spring",
              duration: 0.8,
              delay: 0.5,
}}
            >
              I turn ideas into interactive web realities.
            </motion.div>
            <motion.div className="description"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              type: "spring",
              duration: 0.5,
              delay: 0.6,
}}
            >
            Passionate developer creating captivating user experiences. Expertise in modern tech for efficient web applications. Let's bring your project to life with seamless interfaces.
            </motion.div>
            <motion.a className="btn"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1,boxShadow: "0px 0px 0 #000000" }}
            transition={{

              duration: 0.5,
              scale:{
              delay: 0.7,
              type: "spring",
              duration: 1,
              },
              opacity:{
                type: "spring",
                duration: 1,
              delay: 0.7,
              }
            }}
            whileHover={{
              boxShadow: "40px 0px 0 #000000"
            }}
            target="_blank"
            href="https://drive.google.com/uc?export=download&id=1J6k8wKtTXIj23oTMZkenhy_TaC1MVaaJ"
            >
              {"Resume"}
              <svg
                width="20"
                height="11"
                viewBox="0 0 20 11"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.7081 11L12.7784 10.0703L16.6058 6.25497H0.125V4.92685H16.6058L12.7784 1.09943L13.7081 0.181818L19.1172 5.59091L13.7081 11Z"
                  fill="black"
                  fill-opacity="0.87"
                />
              </svg>
            </motion.a>
          </div>
        </div>
      </div>

  );
}

export default Hero;

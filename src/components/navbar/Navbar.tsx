import React, { useEffect, useState } from "react";
import "./navbar.scss";
import { motion } from "framer-motion";

type Props = {
  isHeroInView: boolean;
};

const Navbar = ({ isHeroInView }: Props) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const isSmallScreen = windowWidth < 768; 
  console.log(isSmallScreen);
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        duration: 0.5,
        delay: 0.2,
      }}
    >
      <motion.div
        key={isHeroInView ? 1 : 0}
        className="logo"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          type: "spring",
          duration: 0.5,
        }}
      >
        <a href="">{(!isHeroInView || isSmallScreen) ? "Nishant Gupta" : "N."}</a>
      </motion.div>
      <motion.div className="nav-options">
        <a href="#projects">Projects</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </motion.div>
    </motion.nav>
  );
};

export default Navbar;

import React from "react";
import "./about.scss";
import { motion } from "framer-motion";
import pfpImg from "../../assets/me.jpeg";

import ParallaxRoller from "../parallaxRoller/ParallaxRoller";
import reactIcon from "../../assets/react-icon.png";
import tailwindIcon from "../../assets/tailwind-icon.png";
import angularIcon from "../../assets/angular-icon.png";
import reduxIcon from "../../assets/redux-icon.png";
import javascriptIcon from "../../assets/javascript-icon.png";
import awsIcon from "../../assets/aws-icon.png";
import gitIcon from "../../assets/git-icon.png";
import githubIcon from "../../assets/github-icon.png";
import sassIcon from "../../assets/sass-icon.png";
import FocusedText from "../focusedText/FocusedText";

function About() {
  const skillsIcons = [
    reactIcon,
    tailwindIcon,
    angularIcon,
    reduxIcon,
    javascriptIcon,
    awsIcon,
    gitIcon,
    githubIcon,
    sassIcon,
  ];

  return (
    <div className="about-container" id="about">
      <motion.div
        className="header"
        viewport={{ once: true }}
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{
          type: "spring",
          duration: 1,
          delay: 0.2,
        }}
      >
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
        <div>About Me</div>
      </motion.div>

      <div className="about-wrapper">
      <div className="pfp-wrapper">
          <motion.div
            className="pfp"
            viewport={{ once: true }}
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              duration: 0.5,
              delay: 0.2,
            }}
          >
            <motion.img
              src={pfpImg}
              alt="pfp"
              viewport={{ once: true }}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{
                type: "spring",
                duration: 0.5,
                delay: 0.4,
              }}
            />
            {/* <div className="pfp-status">👨🏻‍💻</div> */}
          </motion.div>
        </div>
        <motion.div
          className="text"
          viewport={{ once: true }}
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{
            type: "spring",
            duration: 1,
            delay: 0.51,
          }}
        >
          <FocusedText text="As a frontend developer, I am passionate about creating visually appealing and highly functional user experiences. My journey into development began at the age of 15, and since then, I have dedicated my time to mastering the craft and exploring new techniques to create the best possible products for my clients and users." />

          <FocusedText text="Currently, I work at BleedingEdge Technologies where I build accessible, human-centered web applications that solve real-world problems. My expertise in utilizing modern technologies and frameworks allows me to create efficient and user-friendly web applications." />
          <FocusedText text="Overall, I am committed to making a positive impact through my work as a frontend developer and constantly strive to improve my skills and knowledge to create even better products." />
        </motion.div>
        
      </div>

      <motion.div
        className="skills-wrapper"
        viewport={{ once: true }}
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{
          type: "spring",
          duration: 1,
          delay: 0.51,
        }}
      >
        <ParallaxRoller baseVelocity={-1}>
          {skillsIcons.map((icon, index) => {
            return <motion.img className="skillIcon" key={index} src={icon} />;
          })}
        </ParallaxRoller>
      </motion.div>
    </div>
  );
}

export default About;

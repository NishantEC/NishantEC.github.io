import React, { useEffect, useRef } from "react";
import "./projects.scss";
import project1Img from "../../assets/project1.png";
import project2Img from "../../assets/project2.png";
import project3Img from "../../assets/project3.png";
import {
  motion,
  useInView,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

function Projects() {
  const projectsData = [
    {
      heading: "OneStop Delivery Rider App",
      description:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, voluptatum.",
      points: [
        "Lorem ipsum dolor sitg elit. Quisquam, voluptatum.",
        "Lorem met consectetur adipisicing elit. Quisquam, voluptatum.",
        "Lorem ipsum dolor sit amet consquam, voluptatum.",
      ],
      techStack: ["React", "Redux", "Typescript", "Sass"],
      githubLink: "",
      imgUrl: project2Img,
    },
    {
      heading: "Bills Manager",
      description:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, voluptatum.",
      points: [
        "Lorem ipsum dolor sitg elit. Quisquam, voluptatum.",
        "Lorem met consectetur adipisicing elit. Quisquam, voluptatum.",
        "Lorem ipsum dolor sit amet consquam, voluptatum.",
      ],
      techStack: ["React", "Redux", "ChartJs", "Sass"],
      githubLink: "",
      imgUrl: project1Img,
    },

    {
      heading: "Pomodoro V2",
      description:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, voluptatum.",

      points: [
        "Lorem ipsum dolor sitg elit. Quisquam, voluptatum.",
        "Lorem met consectetur adipisicing elit. Quisquam, voluptatum.",
        "Lorem ipsum dolor sit amet consquam, voluptatum.",
      ],
      techStack: ["React", "Redux"],
      githubLink: "",
      imgUrl: project3Img,
    },
  ];

  const ProjectContainer = ({ project }: any) => {
    const ref = useRef<HTMLDivElement>(null);
    // const isInView = useInView(ref, { once: true });
    const { scrollYProgress } = useScroll({
      target: ref,
      offset: ["start end", "start start"],
    });

    // const perspective = useTransform(scrollYProgress, [0, 1], [1200, 0]);
    const rotateXT = useTransform(scrollYProgress, [0.2, 0.5], [25, 0]);
    const scale = useTransform(scrollYProgress, [0.3, 0.4], [0.95, 1]);
    const translateY = useTransform(scrollYProgress, [0, 0.8], [0, -30]);
    const rotateX = useSpring(rotateXT, { stiffness: 600, damping: 50 });
    return (
      <motion.div
        className="project-container"
        ref={ref}
        transition={{
          type: "spring",
        }}
      >
        <motion.div
          className="project-wrapper"
          style={{
            rotateX,
            translateY,
          }}
          animate={{
            border: "5px solid rgba(255,255,255, 0.15)",
          }}
          whileHover={{
            border: "5px solid rgba(255,255,255, 0.9)",
            y: -5,
          }}
        >
          <div className="project-content">
            <div className="heading">{project.heading}</div>
            <div className="techstack-wrapper">
              {project.techStack.map((tech: any, index: any) => (
                <span className="tech-tag">{tech}</span>
              ))}
            </div>
            <div className="description"> {project.description} </div>
            <div className="points">
              {project.points.map((point: any, index: any) => (
                <div className="point" key={index}>
                  <div className="point-icon">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="5" cy="5" r="5" />
                    </svg>
                  </div>
                  <div className="point-text">{point}</div>
                </div>
              ))}
            </div>
            <div className="links">
              <div className="github-link">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <div className="live-link">
                Try Demo
                <svg
                  clip-rule="evenodd"
                  fill-rule="evenodd"
                  stroke-linejoin="round"
                  stroke-miterlimit="2"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="m14.523 18.787s4.501-4.505 6.255-6.26c.146-.146.219-.338.219-.53s-.073-.383-.219-.53c-1.753-1.754-6.255-6.258-6.255-6.258-.144-.145-.334-.217-.524-.217-.193 0-.385.074-.532.221-.293.292-.295.766-.004 1.056l4.978 4.978h-14.692c-.414 0-.75.336-.75.75s.336.75.75.75h14.692l-4.979 4.979c-.289.289-.286.762.006 1.054.148.148.341.222.533.222.19 0 .378-.072.522-.215z"
                    fill-rule="nonzero"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="project-img">
            <img src={project.imgUrl} alt="" />
          </div>
        </motion.div>
      </motion.div>
    );
  };
  return (
    <div className="projects-container" id="projects">
      <motion.div
        className="header"
        viewport={{ once: true }}
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{
          type: "spring",
          duration: 0.5,
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
        <div>Projects</div>
      </motion.div>
      <div className="projects-wrapper">
        {projectsData.map((project, index) => (
          <ProjectContainer project={project} key={index} />
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export default React.memo(Projects);

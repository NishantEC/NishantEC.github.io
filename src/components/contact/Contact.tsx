import React, { useState } from 'react';
import emailjs from 'emailjs-com';
import { motion } from 'framer-motion';
import './contact.scss';

const ContactForm = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedEmail = e.target.value;
    setEmail(updatedEmail);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleSubmit = async () => {


    if (!email || !message || !name) {
      console.log('Please fill in all fields');
      return;
    }

    try {
      await emailjs.send(
        'service_mgvu6ym',
        'template_cw0q4rt',
        {
          email: email,
          name: name,
          message: message,
        },
        'r-kxd1tqqxnxSO7R-'
      );

      console.log('Email sent successfully');
      setEmail('');
      setMessage('');
      setName('');
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  return (
    <div className="contactForm-container" id='contact'>
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
        <div>Contact Me</div>
      </motion.div>

    <form >
      <div>
      <label>
        Email:
        <input type="email" name="email" value={email} onChange={handleEmailChange} />
      </label>
      <label>
        Name:
        <input type="text" name="name" value={name} onChange={handleNameChange} />
      </label>

      </div>
      <label>
        Message:
        <textarea name="message" value={message} onChange={handleMessageChange} />
      </label>

    </form>
      <div className='btn-wrapper'>
      <button onClick={()=>handleSubmit()}>Submit</button>
      </div>
    </div>
  );
};

export default ContactForm;

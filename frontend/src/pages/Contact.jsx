import { useState } from "react";
import axios from "axios";

const Contact = () => {

  const [form,setForm] = useState({
    name:"",
    phone:"",
    subject:"",
    email:"",
    message:""
  });

  const handleChange = (e)=>{
    setForm({
      ...form,
      [e.target.name]:e.target.value
    });
  };

  const handleSubmit = async ()=>{

    await axios.post(
      "https://southfriends.onrender.com/api/contact",
      form
    );

    alert("Message sent successfully!");

  };

  return (

    <div>

      {/* HEADER */}

      <div
        className="h-[220px] sm:h-[300px] bg-cover bg-center flex items-center justify-center"
        style={{ backgroundImage: "url(https://images.unsplash.com/photo-1519389950473-47ba0277781c)" }}
      >

        <h1 className="text-3xl sm:text-4xl text-white font-bold">
          Contact Us
        </h1>

      </div>

      {/* FORM */}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        <h2 className="text-2xl font-bold text-center mb-10">
          We'll Be Happy To Help You!
        </h2>

        <div className="grid md:grid-cols-2 gap-6">

          <input name="name" onChange={handleChange} className="border p-3" placeholder="Your Name"/>
          <input name="phone" onChange={handleChange} className="border p-3" placeholder="Contact Number"/>
          <input name="subject" onChange={handleChange} className="border p-3" placeholder="Subject"/>
          <input name="email" onChange={handleChange} className="border p-3" placeholder="Email ID"/>

          <textarea name="message" onChange={handleChange} className="border p-3 md:col-span-2" placeholder="Message" />

        </div>

        <button
          onClick={handleSubmit}
          className="bg-green-500 text-white px-8 py-3 mt-6 rounded"
        >
          Submit
        </button>

      </div>

    </div>

  );

};

export default Contact;

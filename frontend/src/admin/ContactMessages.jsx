import { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "./AdminLayout";

export default function ContactMessages() {

  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [selectedEmail, setSelectedEmail] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:5000/api/contact").then((res) => {
      setMessages(res.data);
    });
  }, []);


  const sendReply = async () => {
    await axios.post("http://localhost:5000/api/reply", {
      email: selectedEmail,
      message: replyText
    });

    alert("Reply sent!");

    setReplyText("");
    setSelectedEmail(null);

  };

  const deleteMessage = async (id) => {
    await axios.delete(`http://localhost:5000/api/contact/${id}`);
    setMessages((current) => current.filter((message) => message._id !== id));
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h2 className="text-2xl font-bold mb-6">Contact Messages</h2>
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-4 text-left">Name</th>
                  <th className="p-4 text-left">Email</th>
                  <th className="p-4 text-left">Message</th>
                  <th className="p-4 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {messages.map((msg) => (
                  <tr key={msg._id} className="border-t">
                    <td className="p-4">{msg.name}</td>
                    <td className="p-4">{msg.email}</td>
                    <td className="p-4">{msg.message}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setSelectedEmail(msg.email)}
                          className="bg-blue-500 text-white px-3 py-1 rounded"
                        >
                          Reply
                        </button>

                        <button
                          onClick={() => deleteMessage(msg._id)}
                          className="bg-red-500 text-white px-3 py-1 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedEmail && (
          <div className="mt-8 bg-white p-6 shadow rounded">
            <h3 className="font-bold mb-3">Reply to {selectedEmail}</h3>

            <textarea
              className="w-full border p-3 h-32"
              placeholder="Write your reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />

            <button
              onClick={sendReply}
              className="bg-green-600 text-white px-6 py-2 mt-4 rounded"
            >
              Send Reply
            </button>

          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// chat.jsx
import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";

export default function Chat({ messages, disabled, onSend }) {
  const [input, setInput] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages]);

  function handleSend() {
    const val = input.trim();
    if (!val) return;
    console.log("Submitting value:", val);
    onSend(val);
    setInput(""); // clear
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();   // stop form from submitting early
      handleSend();
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-list" ref={listRef}>
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
      </div>

      <div className="chat-input">
        <input
  id="chat-input"
  name="chatInput"
  type="text"
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder="Ask about your presentation..."
  disabled={disabled}
/>

        <button type="button" onClick={handleSend} disabled={disabled}>
          Send
        </button>
      </div>
    </div>
  );
}


// // chat.jsx
// import { useEffect, useRef } from "react";
// import MessageBubble from "./MessageBubble";
 
// export default function Chat({ messages, disabled, onSend }) {
//   const inputRef = useRef(null);
//   const listRef = useRef(null);
 
//   useEffect(() => {
//     listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
//   }, [messages]);
 
//   function handleSubmit(e) {
//     e.preventDefault();
//     const val = inputRef.current.value.trim();
//     if (!val) return;
//     console.log("Submitting value:", val);
//     onSend(val);
//     inputRef.current.value = "";
//   }
 
//   return (
//     <div className="chat-container">
//       <div className="chat-list" ref={listRef}>
//         {messages.map((m, i) => (
//           <MessageBubble key={i} role={m.role} content={m.content} />
//         ))}
//       </div>
 
//       <form className="chat-input" onSubmit={handleSubmit}>
//         <input
//           ref={inputRef}
//           placeholder="Ask about your presentation..."
//           disabled={disabled}
//         />
//         <button type="submit" disabled={disabled}>Send</button>
//       </form>
//     </div>
//   );
// }
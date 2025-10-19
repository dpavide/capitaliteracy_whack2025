import React, { useState } from "react";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const res = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();
      const botReply = {
        sender: "bot",
        text: data.reply || "Sorry, no response.",
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err) {
      console.error("Chatbot error:", err);
      setMessages((prev) => [...prev, { sender: "bot", text: "Error connecting to chatbot." }]);
    }
  };

  return (
    <Box sx={{ marginTop: 6, width: "100%", maxWidth: 800 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        💬 Ask Me Anything
      </Typography>

      <Paper elevation={3} sx={{ p: 2, maxHeight: 300, overflowY: "auto", mb: 2 }}>
        {messages.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Ask something like: "How much did I spend on food?"
          </Typography>
        )}
        {messages.map((msg, idx) => (
          <Box key={idx} sx={{ mb: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: msg.sender === "user" ? 600 : 400,
                color: msg.sender === "user" ? "primary.main" : "text.secondary",
              }}
            >
              {msg.sender === "user" ? "You" : "Bot"}: {msg.text}
            </Typography>
          </Box>
        ))}
      </Paper>

      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          label="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <Button variant="contained" onClick={handleSend}>
          Send
        </Button>
      </Box>
    </Box>
  );
}

export default Chatbot;
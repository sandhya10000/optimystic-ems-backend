const getClientIp = (req) => {
  let ip = req.ip || req.socket?.remoteAddress || "";

  // IPv4-mapped IPv6 address ko normalize karein
  if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  // IPv6 loopback normalize
  if (ip === "::1") {
    ip = "127.0.0.1";
  }

  return ip.trim();
};

module.exports = getClientIp;

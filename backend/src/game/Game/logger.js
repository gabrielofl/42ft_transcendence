import fs from "fs";
import path from "path";

// Ruta del archivo de logs dentro del contenedor
const logFile = path.resolve("/app/logs/app.log");

// Asegura que la carpeta de logs existe
if (!fs.existsSync(path.dirname(logFile))) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
}

// Función para escribir logs
export function logToFile(message, data = null) {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] ${message}`;
  if (data !== null) {
    // Si pasas un objeto, lo convierte en JSON bonito
    logMessage += ` | ${JSON.stringify(data, null, 2)}`;
  }

  // Escribe el mensaje en el archivo
  fs.appendFileSync(logFile, logMessage + "\n", "utf8");
}

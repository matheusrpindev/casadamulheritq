// Gera as chaves de criptografia para o arquivo .env. Uso: npm run gerar-chaves
import { randomBytes } from "node:crypto";

console.log(`CHAVE_CRIPTOGRAFIA=${randomBytes(32).toString("base64")}`);
console.log(`CHAVE_INDICE=${randomBytes(32).toString("base64")}`);
console.error("\nGuarde estas chaves em local seguro (cofre de senhas), separado do backup do banco.");
console.error("Sem a CHAVE_CRIPTOGRAFIA os relatos não podem ser lidos — nem pela equipe de TI.");

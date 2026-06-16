// tools/convert-seed.js
// Converte os INSERTs SQL (BD/BD/*.txt) em JSON de seed para o PocketBase.
// Uso: node tools/convert-seed.js
const fs = require('fs');
const path = require('path');

const BD = path.join(__dirname, '..', 'BD', 'BD');
const OUT = path.join(__dirname, '..', 'BackEnd', 'seed');
fs.mkdirSync(OUT, { recursive: true });

function read(file) {
  return fs.readFileSync(path.join(BD, file), 'utf8');
}

// Converte um valor SQL bruto em valor JS
function parseValue(raw) {
  const v = raw.trim();
  if (v.length >= 2 && v[0] === "'" && v[v.length - 1] === "'") {
    return v.slice(1, -1).replace(/''/g, "'");
  }
  if (/^null$/i.test(v)) return null;
  if (/^true$/i.test(v)) return true;
  if (/^false$/i.test(v)) return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

// Divide o conteudo de uma tupla "(a, 'b,c', NULL)" em valores, respeitando aspas
function splitTuple(str) {
  const out = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inQuote) {
      if (ch === "'" && str[i + 1] === "'") { cur += "''"; i++; continue; }
      if (ch === "'") { inQuote = false; cur += ch; continue; }
      cur += ch;
    } else {
      if (ch === "'") { inQuote = true; cur += ch; continue; }
      if (ch === ',') { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
  }
  if (cur.trim() !== '') out.push(cur);
  return out.map(parseValue);
}

// Extrai todas as linhas de um INSERT INTO <table> de um texto SQL
function parseInserts(sql, table) {
  const rows = [];
  const re = new RegExp('INSERT\\s+INTO\\s+' + table + '\\s*\\(([^)]*)\\)\\s*VALUES', 'gi');
  let m;
  while ((m = re.exec(sql)) !== null) {
    const cols = m[1].split(',').map((c) => c.trim().replace(/[`"]/g, ''));
    // Varre as tuplas a partir do fim do "VALUES"
    let i = re.lastIndex;
    let depth = 0;
    let inQuote = false;
    let tupleStart = -1;
    for (; i < sql.length; i++) {
      const ch = sql[i];
      if (inQuote) {
        if (ch === "'" && sql[i + 1] === "'") { i++; continue; }
        if (ch === "'") inQuote = false;
        continue;
      }
      if (ch === "'") { inQuote = true; continue; }
      if (ch === '(') { if (depth === 0) tupleStart = i + 1; depth++; continue; }
      if (ch === ')') {
        depth--;
        if (depth === 0) {
          const tuple = sql.slice(tupleStart, i);
          const vals = splitTuple(tuple);
          const obj = {};
          cols.forEach((c, idx) => { obj[c] = vals[idx]; });
          rows.push(obj);
          // Olha o proximo token significativo: virgula = mais tuplas; senao para
          let j = i + 1;
          while (j < sql.length && /\s/.test(sql[j])) j++;
          if (sql[j] !== ',') break; // chegou em ; ou ON CONFLICT
        }
        continue;
      }
    }
  }
  return rows;
}

// ----- LOCAIS_BASE -----
const locaisFiles = ['ATMLog.txt', 'Enderecos1.txt', 'Enderecos2.txt', 'Enderecso3.txt', 'Enderecos4.txt'];
let locais = [];
for (const f of locaisFiles) {
  if (!fs.existsSync(path.join(BD, f))) { console.log('  (pulado, nao existe) ' + f); continue; }
  const got = parseInserts(read(f), 'locais_base');
  console.log(`  ${f}: ${got.length} locais`);
  locais = locais.concat(got);
}
// normaliza para os campos da colecao e remove o "id" do Postgres
const seenLocal = new Set();
const locaisOut = [];
for (const r of locais) {
  const o = {
    nome_local: r.nome_local || '',
    logradouro: r.logradouro || '',
    numero: r.numero || '',
    bairro: r.bairro || '',
    municipio: r.municipio || '',
    uf: r.uf || '',
    cep: r.cep || '',
    ativo: r.ativo === undefined ? true : !!r.ativo,
  };
  const key = (o.nome_local + '|' + o.cep).toUpperCase();
  if (seenLocal.has(key)) continue;
  seenLocal.add(key);
  locaisOut.push(o);
}

// ----- PROJETOS -----
const projFiles = ['ATMLog.txt', 'Projetos.txt'];
let projetos = [];
for (const f of projFiles) {
  if (!fs.existsSync(path.join(BD, f))) continue;
  const got = parseInserts(read(f), 'projetos');
  console.log(`  ${f}: ${got.length} projetos`);
  projetos = projetos.concat(got);
}
const seenWbs = new Set();
const projetosOut = [];
for (const r of projetos) {
  const wbs = (r.wbs || '').trim();
  if (!wbs) continue;
  if (seenWbs.has(wbs.toUpperCase())) continue;
  seenWbs.add(wbs.toUpperCase());
  projetosOut.push({ wbs, ativo: true });
}

fs.writeFileSync(path.join(OUT, 'locais_base.json'), JSON.stringify(locaisOut, null, 2));
fs.writeFileSync(path.join(OUT, 'projetos.json'), JSON.stringify(projetosOut, null, 2));

console.log('\nRESULTADO:');
console.log('  locais_base.json -> ' + locaisOut.length + ' registros unicos');
console.log('  projetos.json    -> ' + projetosOut.length + ' registros unicos');
console.log('\nAmostra locais[0..2]:');
console.log(JSON.stringify(locaisOut.slice(0, 3), null, 2));

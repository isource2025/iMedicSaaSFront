const fs = require('fs');
for (const f of [
	'src/app/components/Sidebar/Sidebar.tsx',
	'src/app/utils/permisos.ts',
]) {
	let s = fs.readFileSync(f, 'utf8');
	const before = s;
	s = s.replace(/Consultar Historia Clínica/g, 'Consulta general de admisiones');
	fs.writeFileSync(f, s);
	console.log(f, before === s ? 'no change' : 'updated');
}

const units = [];

const words = text => text.toLowerCase().replace(/[−–—]/g, '-').replace(/µ/g, 'u').replace(/²/g, '2').replace(/³/g, '3').replace(/·/g, ' ').replace(/\s+/g, ' ').trim();
const names = (name, symbol, extra = []) => [...new Set([name, symbol, ...extra].flatMap(value => [value, `${value}s`]).map(words))];

function add(category, entries) {
  for (const [symbol, name, factor, extra = []] of entries) {
    units.push({ category, symbol, name, factor, aliases: names(name, symbol, extra) });
  }
}

// Every linear factor is expressed in the first unit (or the SI unit) of its category.
add('length', [
  ['qm','quectometer',1e-30],['rm','rontometer',1e-27],['ym','yoctometer',1e-24],['zm','zeptometer',1e-21],['am','attometer',1e-18],['fm','femtometer',1e-15],['pm','picometer',1e-12],['nm','nanometer',1e-9],['µm','micrometer',1e-6,['micron']],['mm','millimeter',1e-3],['cm','centimeter',1e-2],['dm','decimeter',.1],['m','meter',1,['metre']],['dam','decameter',10],['hm','hectometer',100],['km','kilometer',1e3,['kilometre','kms']],['Mm','megameter',1e6],['Gm','gigameter',1e9],['Å','angstrom',1e-10],['mil','thou',.0000254],['in','inch',.0254,['inches']],['ft','foot',.3048,['feet']],['yd','yard',.9144],['rd','rod',5.0292],['ch','chain',20.1168],['fur','furlong',201.168],['mi','mile',1609.344],['ftm','fathom',1.8288],['cable','cable length',185.2],['nmi','nautical mile',1852],['au','astronomical unit',149597870700],['ly','light-year',9.4607304725808e15],['pc','parsec',3.085677581491367e16]
]);
add('area', [['mm²','square millimeter',1e-6,['mm2']],['cm²','square centimeter',1e-4,['cm2']],['dm²','square decimeter',.01,['dm2']],['m²','square meter',1,['m2','sq m']],['a','are',100],['ha','hectare',1e4],['km²','square kilometer',1e6,['km2']],['in²','square inch',.00064516,['in2']],['ft²','square foot',.09290304,['ft2','sq ft','square feet']],['yd²','square yard',.83612736,['yd2']],['acre','acre',4046.8564224],['mi²','square mile',2589988.110336,['mi2']],['nmi²','square nautical mile',3429904,['nmi2']],['b','barn',1e-28]]);
add('volume', [['µL','microliter',1e-6],['mL','milliliter',.001],['cL','centiliter',.01],['dL','deciliter',.1],['L','liter',1,['litre']],['m³','cubic meter',1000,['m3']],['cm³','cubic centimeter',.001,['cm3','cc']],['mm³','cubic millimeter',1e-6,['mm3']],['in³','cubic inch',.016387064,['in3']],['ft³','cubic foot',28.316846592,['ft3']],['yd³','cubic yard',764.554857984,['yd3']],['tsp (US)','US teaspoon',.00492892159375,['tsp']],['tbsp (US)','US tablespoon',.01478676478125,['tbsp']],['fl oz (US)','US fluid ounce',.0295735295625,['fl oz']],['cup (US)','US cup',.2365882365,['cup']],['pt (US)','US liquid pint',.473176473,['pint']],['qt (US)','US liquid quart',.946352946,['quart']],['gal (US)','US liquid gallon',3.785411784,['gallon','gal']],['fl oz (Imp)','Imperial fluid ounce',.0284130625],['gill (Imp)','Imperial gill',.1420653125],['pt (Imp)','Imperial pint',.56826125],['qt (Imp)','Imperial quart',1.1365225],['gal (Imp)','Imperial gallon',4.54609],['tsp (metric)','metric teaspoon',.005],['tbsp (metric)','metric tablespoon',.015],['cup (metric)','metric cup',.25],['tbsp (AU)','Australian tablespoon',.02],['dry pt (US)','US dry pint',.5506104713575],['dry qt (US)','US dry quart',1.101220942715],['dry gal (US)','US dry gallon',4.40488377086],['pk','US peck',8.80976754172],['bu','US bushel',35.23907016688],['bbl (oil)','oil barrel',158.987294928]]);
add('mass', [['µg','microgram',1e-6],['mg','milligram',.001],['cg','centigram',.01],['g','gram',1],['dag','decagram',10],['hg','hectogram',100],['kg','kilogram',1000,['kilo']],['t','tonne',1e6,['metric ton']],['ct','carat',.2],['gr','grain',.06479891],['dr','avoirdupois dram',1.7718451953125],['oz','avoirdupois ounce',28.349523125,['ounce']],['lb','pound',453.59237],['st','stone',6350.29318],['cwt (US)','US hundredweight',45359.237],['cwt (Imp)','Imperial hundredweight',50802.34544],['ton (US)','short ton',907184.74,['ton']],['ton (Imp)','long ton',1016046.9088],['oz t','troy ounce',31.1034768],['lb t','troy pound',373.2417216]]);

function affine(symbol, name, toBase, fromBase, extra = []) { units.push({ category:'temperature', symbol, name, aliases:names(name,symbol,extra), toBase, fromBase }); }
affine('K','kelvin',v=>v,v=>v);
affine('°C','degree Celsius',v=>v+273.15,v=>v-273.15,['celsius','c']);
affine('°F','degree Fahrenheit',v=>(v+459.67)*5/9,v=>v*9/5-459.67,['fahrenheit','f']);
affine('°R','degree Rankine',v=>v*5/9,v=>v*9/5,['rankine']);
affine('°Ré','degree Reaumur',v=>v*1.25+273.15,v=>(v-273.15)*.8,['reaumur']);
affine('°De','degree Delisle',v=>373.15-v*2/3,v=>(373.15-v)*1.5,['delisle']);
affine('°N','degree Newton',v=>v*100/33+273.15,v=>(v-273.15)*33/100,['newton','newton temperature']);
affine('°Rø','degree Romer',v=>(v-7.5)*40/21+273.15,v=>(v-273.15)*21/40+7.5,['romer']);

add('speed', [['m/s','meter per second',1],['km/h','kilometer per hour',1/3.6,['kph']],['mph','mile per hour',.44704],['ft/s','foot per second',.3048],['kn','knot',.5144444444444445],['Mach','Mach (approximate)',340.2933,['mach']]]);
for (const unit of units.filter(unit => unit.category === 'speed')) unit.conversionGroup = 'pace-speed';
// Pace factors are seconds per meter. This is linear because every unit is time per a fixed distance.
add('pace', [['min/mi','minute per mile',60/1609.344,['/mi']],['min/km','minute per kilometer',.06,['/km']],['sec/400 m','second per 400 meters',1/400,['s/400m','sec/400m','/400m']],['min/100 m','minute per 100 meters',.6,['min/100m']],['min/100 yd','minute per 100 yards',60/91.44,['min/100yd']],['min/500 m','minute per 500 meters',.12,['min/500m']],['s/m','second per meter',1],['sec/100 m','second per 100 meters',.01,['s/100m','sec/100m']],['sec/100 yd','second per 100 yards',1/91.44,['s/100yd','sec/100yd']],['sec/50 m','second per 50 meters',.02,['s/50m','sec/50m']],['sec/50 yd','second per 50 yards',1/45.72,['s/50yd','sec/50yd']]]);
for (const unit of units.filter(unit => unit.category === 'pace')) unit.conversionGroup = 'pace-speed';
add('time', [['ns','nanosecond',1e-9],['µs','microsecond',1e-6],['ms','millisecond',.001],['s','second',1],['min','minute',60],['h','hour',3600,['hr']],['d','day',86400],['wk','week',604800],['fortnight','fortnight',1209600],['yr365','common year',31536000],['yr366','leap year',31622400],['a','Julian year',31557600]]);
add('angle', [['rad','radian',1],['mrad','milliradian',.001],['µrad','microradian',1e-6],['°','degree',Math.PI/180,['deg']],['′','arcminute',Math.PI/10800],['″','arcsecond',Math.PI/648000],['gon','gradian',Math.PI/200],['rev','revolution',Math.PI*2,['turn']]]);
add('frequency', [['µHz','microhertz',1e-6],['mHz','millihertz',.001],['Hz','hertz',1],['kHz','kilohertz',1e3],['MHz','megahertz',1e6],['GHz','gigahertz',1e9],['THz','terahertz',1e12],['rpm','revolution per minute',1/60],['rps','revolution per second',1],['cpm','cycle per minute',1/60]]);
add('acceleration', [['m/s²','meter per second squared',1,['m/s2']],['cm/s²','centimeter per second squared',.01,['cm/s2']],['ft/s²','foot per second squared',.3048,['ft/s2']],['Gal','galileo',.01],['g₀','standard gravity',9.80665,['g0']]]);
add('force', [['µN','micronewton',1e-6],['mN','millinewton',.001],['N','newton',1],['kN','kilonewton',1e3],['MN','meganewton',1e6],['dyn','dyne',1e-5],['kgf','kilogram-force',9.80665],['lbf','pound-force',4.4482216152605],['kip','kip-force',4448.2216152605]]);
add('pressure', [['Pa','pascal',1],['hPa','hectopascal',100],['kPa','kilopascal',1e3],['MPa','megapascal',1e6],['GPa','gigapascal',1e9],['bar','bar',1e5],['mbar','millibar',100],['atm','standard atmosphere',101325],['Torr','torr',101325/760],['mmHg','millimeter of mercury',133.322387415],['cmHg','centimeter of mercury',1333.22387415],['inHg','inch of mercury',3386.389],['psi','pound-force per square inch',6894.757293168],['ksi','kip per square inch',6894757.293168],['psf','pound-force per square foot',47.8802589803],['kgf/cm²','kilogram-force per square centimeter',98066.5,['kgf/cm2']],['mmH₂O','millimeter of water',9.80665,['mmh2o']],['cmH₂O','centimeter of water',98.0665,['cmh2o']],['inH₂O','inch of water',249.08891,['inh2o']]]);
add('energy', [['µJ','microjoule',1e-6],['mJ','millijoule',.001],['J','joule',1],['kJ','kilojoule',1e3],['MJ','megajoule',1e6],['GJ','gigajoule',1e9],['Wh','watt-hour',3600],['kWh','kilowatt-hour',3.6e6],['MWh','megawatt-hour',3.6e9],['cal','thermochemical calorie',4.184],['kcal','kilocalorie',4184,['food calorie']],['cal IT','International Table calorie',4.1868],['BTU','International Table BTU',1055.05585262],['therm','US therm',105480400],['ft·lbf','foot-pound force',1.3558179483314],['erg','erg',1e-7],['eV','electronvolt',1.602176634e-19],['keV','kiloelectronvolt',1.602176634e-16],['MeV','megaelectronvolt',1.602176634e-13],['GeV','gigaelectronvolt',1.602176634e-10],['toe','tonne of oil equivalent',41.868e9]]);
add('power', [['µW','microwatt',1e-6],['mW','milliwatt',.001],['W','watt',1],['kW','kilowatt',1e3],['MW','megawatt',1e6],['GW','gigawatt',1e9],['TW','terawatt',1e12],['hp','mechanical horsepower',745.699871582],['PS','metric horsepower',735.49875],['BTU/h','BTU per hour',1055.05585262/3600],['ft·lbf/s','foot-pound force per second',1.3558179483314],['TR','ton of refrigeration',3516.8528420667]]);
add('torque', [['N·m','newton-meter',1],['N·cm','newton-centimeter',.01],['mN·m','millinewton-meter',.001],['kgf·m','kilogram-force meter',9.80665],['kgf·cm','kilogram-force centimeter',.0980665],['lbf·ft','pound-force foot',1.3558179483314],['lbf·in','pound-force inch',.11298482902762],['ozf·in','ounce-force inch',.007061551814226]]);
add('density', [['kg/m³','kilogram per cubic meter',1,['kg/m3']],['g/m³','gram per cubic meter',.001,['g/m3']],['g/L','gram per liter',1],['kg/L','kilogram per liter',1000],['g/mL','gram per milliliter',1000],['g/cm³','gram per cubic centimeter',1000,['g/cm3']],['lb/ft³','pound per cubic foot',16.01846337396,['lb/ft3']],['lb/in³','pound per cubic inch',27679.9047102,['lb/in3']],['oz/in³','ounce per cubic inch',1729.99404439,['oz/in3']]]);
add('volumetric flow', [['m³/s','cubic meter per second',1,['m3/s']],['m³/min','cubic meter per minute',1/60,['m3/min']],['m³/h','cubic meter per hour',1/3600,['m3/h']],['L/s','liter per second',.001],['L/min','liter per minute',.001/60],['L/h','liter per hour',.001/3600],['mL/min','milliliter per minute',1e-6/60],['gpm (US)','US gallon per minute',.003785411784/60],['gph (US)','US gallon per hour',.003785411784/3600],['gpm (Imp)','Imperial gallon per minute',.00454609/60],['ft³/s','cubic foot per second',.028316846592,['ft3/s']],['cfm','cubic foot per minute',.028316846592/60]]);
add('mass flow', [['kg/s','kilogram per second',1],['kg/min','kilogram per minute',1/60],['kg/h','kilogram per hour',1/3600],['g/s','gram per second',.001],['g/min','gram per minute',.001/60],['lb/s','pound per second',.45359237],['lb/min','pound per minute',.45359237/60],['lb/h','pound per hour',.45359237/3600],['t/h','tonne per hour',1000/3600],['ton/h (US)','short ton per hour',907.18474/3600]]);
add('dynamic viscosity', [['Pa·s','pascal-second',1],['mPa·s','millipascal-second',.001],['P','poise',.1],['cP','centipoise',.001],['lb/(ft·s)','pound per foot-second',1.48816394357],['lb/(ft·h)','pound per foot-hour',1.48816394357/3600]]);
add('kinematic viscosity', [['m²/s','square meter per second',1,['m2/s']],['mm²/s','square millimeter per second',1e-6,['mm2/s']],['St','stokes',1e-4],['cSt','centistokes',1e-6],['ft²/s','square foot per second',.09290304,['ft2/s']],['in²/s','square inch per second',.00064516,['in2/s']]]);

const decimalBytes = [['bit','bit',1/8],['nibble','nibble',.5],['B','byte',1],...['kMGTPEZYRQ'].map(()=>[])];
add('digital storage', [['bit','bit',.125],['nibble','nibble',.5],['B','byte',1],...['kB','MB','GB','TB','PB','EB','ZB','YB','RB','QB'].map((s,i)=>[s,`${['kilo','mega','giga','tera','peta','exa','zetta','yotta','ronna','quetta'][i]}byte`,10**((i+1)*3)]),...['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB','RiB','QiB'].map((s,i)=>[s,`${['kibi','mebi','gibi','tebi','pebi','exbi','zebi','yobi','robi','quebi'][i]}byte`,2**((i+1)*10)])]);
add('data rate', [['bit/s','bit per second',1],['B/s','byte per second',8],...['kbit/s','Mbit/s','Gbit/s','Tbit/s','Pbit/s'].map((s,i)=>[s,`${['kilo','mega','giga','tera','peta'][i]}bit per second`,10**((i+1)*3)]),...['kB/s','MB/s','GB/s','TB/s'].map((s,i)=>[s,`${['kilo','mega','giga','tera'][i]}byte per second`,8*10**((i+1)*3)]),...['Kibit/s','Mibit/s','Gibit/s','Tibit/s','Pibit/s','Eibit/s','Zibit/s','Yibit/s'].flatMap((s,i)=>[[s,`${['kibi','mebi','gibi','tebi','pebi','exbi','zebi','yobi'][i]}bit per second`,2**((i+1)*10)],[s.replace('bit','B'),`${['kibi','mebi','gibi','tebi','pebi','exbi','zebi','yobi'][i]}byte per second`,8*2**((i+1)*10)]])]);

// Fuel economy uses liters per 100 km as a reciprocal base.
function fuel(symbol,name,toBase,fromBase,extra=[]) { units.push({category:'fuel economy',symbol,name,aliases:names(name,symbol,extra),toBase,fromBase}); }
fuel('L/100km','liters per 100 kilometers',v=>v,v=>v);
fuel('km/L','kilometers per liter',v=>100/v,v=>100/v);
fuel('mpg (US)','miles per US gallon',v=>235.214583/v,v=>235.214583/v,['mpg']);
fuel('mpg (Imp)','miles per Imperial gallon',v=>282.480936/v,v=>282.480936/v);
fuel('gal/100mi (US)','US gallons per 100 miles',v=>v*2.352145833,v=>v/2.352145833);

add('ratio', [['1','fraction',1],['%','percent',.01],['‰','per mille',.001],['bp','basis point',.0001],['ppm','part per million',1e-6],['ppb','part per billion',1e-9],['ppt','part per trillion',1e-12],['ppq','part per quadrillion',1e-15]]);
const metric = (category, baseSymbol, baseName, specs) => add(category, specs.map(([prefix, factor, pname])=>[`${prefix}${baseSymbol}`,`${pname}${baseName}`,factor]));
metric('electric current','A','ampere',[['n',1e-9,'nano'],['µ',1e-6,'micro'],['m',1e-3,'milli'],['',1,''],['k',1e3,'kilo'],['M',1e6,'mega']]);
add('electric charge', [['nC','nanocoulomb',1e-9],['µC','microcoulomb',1e-6],['mC','millicoulomb',.001],['C','coulomb',1],['Ah','ampere-hour',3600],['mAh','milliampere-hour',3.6],['e','elementary charge',1.602176634e-19]]);
metric('voltage','V','volt',[['µ',1e-6,'micro'],['m',.001,'milli'],['',1,''],['k',1e3,'kilo'],['M',1e6,'mega']]);
metric('resistance','Ω','ohm',[['µ',1e-6,'micro'],['m',.001,'milli'],['',1,''],['k',1e3,'kilo'],['M',1e6,'mega'],['G',1e9,'giga']]);
metric('conductance','S','siemens',[['n',1e-9,'nano'],['µ',1e-6,'micro'],['m',.001,'milli'],['',1,''],['k',1e3,'kilo']]);
metric('capacitance','F','farad',[['p',1e-12,'pico'],['n',1e-9,'nano'],['µ',1e-6,'micro'],['m',.001,'milli'],['',1,'']]);
metric('inductance','H','henry',[['n',1e-9,'nano'],['µ',1e-6,'micro'],['m',.001,'milli'],['',1,'']]);
add('magnetic flux', [['nWb','nanoweber',1e-9],['µWb','microweber',1e-6],['mWb','milliweber',.001],['Wb','weber',1],['Mx','maxwell',1e-8]]);
add('magnetic flux density', [['nT','nanotesla',1e-9],['µT','microtesla',1e-6],['mT','millitesla',.001],['T','tesla',1],['G','gauss',1e-4]]);
add('luminous flux', [['mlm','millilumen',.001],['lm','lumen',1],['klm','kilolumen',1e3]]);
add('illuminance', [['lx','lux',1],['klx','kilolux',1e3],['fc','foot-candle',10.7639104167],['ph','phot',1e4]]);
add('luminance', [['cd/m²','candela per square meter',1,['nit','cd/m2']],['kcd/m²','kilocandela per square meter',1e3,['kcd/m2']],['cd/cm²','candela per square centimeter',1e4,['cd/cm2']],['sb','stilb',1e4],['L','lambert',1e4/Math.PI],['fL','foot-lambert',3.4262590996]]);
add('radioactivity', [['mBq','millibecquerel',.001],['Bq','becquerel',1],['kBq','kilobecquerel',1e3],['MBq','megabecquerel',1e6],['GBq','gigabecquerel',1e9],['Ci','curie',3.7e10],['mCi','millicurie',3.7e7],['µCi','microcurie',3.7e4],['Rd','rutherford',1e6]]);
add('absorbed dose', [['µGy','microgray',1e-6],['mGy','milligray',.001],['Gy','gray',1],['kGy','kilogray',1e3],['rad','rad (dose)',.01]]);
add('equivalent dose', [['µSv','microsievert',1e-6],['mSv','millisievert',.001],['Sv','sievert',1],['rem','rem',.01],['mrem','millirem',1e-5]]);
add('radiation exposure', [['C/kg','coulomb per kilogram',1],['R','roentgen',2.58e-4],['mR','milliroentgen',2.58e-7]]);
add('amount of substance', [['nmol','nanomole',1e-9],['µmol','micromole',1e-6],['mmol','millimole',.001],['mol','mole',1],['kmol','kilomole',1e3],['lb-mol','pound-mole',453.59237]]);
add('catalytic activity', [['nkat','nanokatal',1e-9],['µkat','microkatal',1e-6],['mkat','millikatal',.001],['kat','katal',1],['U','enzyme unit',1/6e7]]);
add('molar concentration', [['mol/L','mole per liter',1],['mmol/L','millimole per liter',.001],['µmol/L','micromole per liter',1e-6],['nmol/L','nanomole per liter',1e-9],['mol/m³','mole per cubic meter',.001,['mol/m3']]]);
add('mass concentration', [['kg/m³','kilogram per cubic meter',1,['kg/m3']],['g/L','gram per liter',1],['mg/L','milligram per liter',.001],['µg/L','microgram per liter',1e-6],['ng/L','nanogram per liter',1e-9],['mg/dL','milligram per deciliter',.01],['g/dL','gram per deciliter',10],['mg/mL','milligram per milliliter',1]]);
add('specific energy', [['J/kg','joule per kilogram',1],['kJ/kg','kilojoule per kilogram',1e3],['MJ/kg','megajoule per kilogram',1e6],['Wh/kg','watt-hour per kilogram',3600],['kWh/kg','kilowatt-hour per kilogram',3.6e6],['kcal/kg','kilocalorie per kilogram',4184],['BTU/lb','BTU per pound',2326]]);
add('volumetric energy density', [['J/m³','joule per cubic meter',1,['j/m3']],['kJ/m³','kilojoule per cubic meter',1e3,['kj/m3']],['MJ/m³','megajoule per cubic meter',1e6,['mj/m3']],['Wh/L','watt-hour per liter',3.6e6],['kWh/L','kilowatt-hour per liter',3.6e9],['BTU/ft³','BTU per cubic foot',37258.9458078,['btu/ft3']]]);
add('irradiance', [['W/m²','watt per square meter',1,['w/m2']],['kW/m²','kilowatt per square meter',1e3,['kw/m2']],['W/cm²','watt per square centimeter',1e4,['w/cm2']],['mW/cm²','milliwatt per square centimeter',10,['mw/cm2']],['BTU/(h·ft²)','BTU per hour square foot',3.154590745,['btu/(h ft2)']]]);
add('thermal conductivity', [['W/(m·K)','watt per meter-kelvin',1],['mW/(m·K)','milliwatt per meter-kelvin',.001],['BTU/(h·ft·°F)','BTU per hour-foot-degree Fahrenheit',1.730734666]]);
add('heat transfer coefficient', [['W/(m²·K)','watt per square meter-kelvin',1,['w/(m2 k)']],['BTU/(h·ft²·°F)','BTU per hour-square foot-degree Fahrenheit',5.678263341]]);
add('specific heat capacity', [['J/(kg·K)','joule per kilogram-kelvin',1],['kJ/(kg·K)','kilojoule per kilogram-kelvin',1e3],['cal/(g·°C)','calorie per gram-degree Celsius',4184],['BTU/(lb·°F)','BTU per pound-degree Fahrenheit',4186.8]]);
add('thermal resistance', [['m²·K/W','square meter-kelvin per watt',1,['m2 k/w']],['ft²·°F·h/BTU','square foot-degree Fahrenheit-hour per BTU',.1761101838,['ft2 f h/btu']]]);
add('typography', [['pt','PostScript point',1/72],['pc','pica',1/6],['px','CSS reference pixel',1/96],['Q','CSS quarter-millimeter',.25/25.4],['mm','millimeter',1/25.4],['cm','centimeter',1/2.54],['in','inch',1]]);
add('pixel density', [['ppi','pixels per inch',1],['dpi','dots per inch',1],['px/cm','pixels per centimeter',2.54],['dpcm','dots per centimeter',2.54]]);
add('symbol rate', [['Bd','baud',1],['kBd','kilobaud',1e3],['MBd','megabaud',1e6],['GBd','gigabaud',1e9]]);
add('information content', [['bit','bit (information)',1],['nat','nat',1/Math.LN2],['Hart','hartley',Math.LOG2E*Math.LN10]]);

// Only genuinely compatible logarithmic quantities share a conversion group.
add('sound level', [['dB','decibel ratio',1],['Np','neper ratio',20/Math.LN10]]);
for (const unit of units.filter(unit => unit.category === 'sound level')) unit.conversionGroup = 'sound ratio';
add('sound level', [['dBm','decibel-milliwatt',1],['dBW','decibel-watt',1],['dBV','decibel-volt',1],['dBu','dBu',1],['dB SPL','sound pressure level',1]]);
for (const unit of units.filter(unit => ['dBm','dBW'].includes(unit.symbol))) unit.conversionGroup = 'sound power';
for (const unit of units.filter(unit => ['dBV','dBu','dB SPL'].includes(unit.symbol))) unit.conversionGroup = unit.symbol;
// dBm and dBW need an offset rather than a scale.
const dbm=units.find(u=>u.symbol==='dBm'), dbw=units.find(u=>u.symbol==='dBW');
Object.assign(dbm,{toBase:v=>v,fromBase:v=>v}); Object.assign(dbw,{toBase:v=>v+30,fromBase:v=>v-30});

// These context-dependent calendar units are discoverable but deliberately do not
// produce misleading fixed-duration conversions without a start date and calendar.
add('calendar duration', [['month','calendar month',1],['quarter','calendar quarter',1],['year','calendar year',1],['decade','decade',1],['century','century',1],['millennium','millennium',1]]);
for (const unit of units.filter(unit => unit.category === 'calendar duration')) unit.conversionGroup = unit.symbol;

add('temperature difference', [['K Δ','kelvin difference',1,['delta k']],['°C Δ','Celsius difference',1,['delta c']],['°F Δ','Fahrenheit difference',5/9,['delta f']],['°R Δ','Rankine difference',5/9,['delta r']]]);

const byAlias = new Map();
for (const unit of units) for (const alias of unit.aliases) {
  const matches = byAlias.get(alias) || [];
  matches.push(unit); byAlias.set(alias, matches);
}

const popularCategoryOrder = ['length', 'temperature', 'mass', 'volume', 'area', 'speed', 'pace', 'time', 'digital storage', 'energy', 'pressure', 'power', 'fuel economy'];
const popularUnits = new Map(Object.entries({
  length: ['km', 'mi', 'm', 'ft', 'cm', 'in'], temperature: ['°C', '°F', 'K'], mass: ['kg', 'lb', 'g', 'oz'],
  volume: ['L', 'gal (US)', 'mL', 'fl oz (US)', 'cup (US)'], area: ['m²', 'ft²', 'ha', 'acre'],
  speed: ['km/h', 'mph', 'm/s'], pace: ['min/mi', 'min/km', 'sec/400 m', 'min/100 m', 'min/100 yd', 'min/500 m'], time: ['min', 'h', 'd', 's'], 'digital storage': ['MB', 'MiB', 'GB', 'GiB'],
  energy: ['kJ', 'kcal', 'kWh', 'J'], pressure: ['bar', 'psi', 'kPa'], power: ['kW', 'hp', 'W'],
  'fuel economy': ['L/100km', 'mpg (US)', 'km/L']
}));
const popularPairList = [
  ['km', 'mi'], ['m', 'ft'], ['cm', 'in'], ['°C', '°F'], ['°C', 'K'], ['kg', 'lb'], ['g', 'oz'],
  ['L', 'gal (US)'], ['mL', 'fl oz (US)'], ['cup (US)', 'mL'], ['m²', 'ft²'], ['ha', 'acre'],
  ['km/h', 'mph'], ['m/s', 'mph'], ['h', 'min'], ['d', 'h'], ['MB', 'MiB'], ['GB', 'GiB'],
  ['kJ', 'kcal'], ['kWh', 'J'], ['bar', 'psi'], ['kPa', 'psi'], ['kW', 'hp'], ['L/100km', 'mpg (US)']
];
const popularPairKeys = new Set(popularPairList.flatMap(([from, to]) => [`${from}\0${to}`, `${to}\0${from}`]));

export function supportedUnits() {
  const categories = new Map();
  for (const unit of units) {
    const category = categories.get(unit.category) || [];
    category.push({ name: unit.name, symbol: unit.symbol, query: unit.name, aliases: unit.aliases, conversionGroup: unit.conversionGroup }); categories.set(unit.category, category);
  }
  return [...categories].map(([category, categoryUnits], sourceIndex) => {
    const preferred = popularUnits.get(category) || [];
    const units = categoryUnits.map((unit, index) => ({ unit, index })).sort((a, b) => {
      const aRank = preferred.indexOf(a.unit.symbol), bRank = preferred.indexOf(b.unit.symbol);
      return (aRank < 0 ? Infinity : aRank) - (bRank < 0 ? Infinity : bRank) || a.index - b.index;
    }).map(({ unit }) => unit);
    const rank = popularCategoryOrder.indexOf(category);
    return { category, units, popular: rank >= 0, rank: rank < 0 ? Infinity : rank, sourceIndex };
  }).sort((a, b) => a.rank - b.rank || a.sourceIndex - b.sourceIndex).map(({ rank, sourceIndex, ...group }) => group);
}

export function supportedPairs() {
  return supportedUnits().map(group => {
    const pairs = group.units.flatMap(from => group.units.filter(to => to !== from && to.conversionGroup === from.conversionGroup).map(to => ({
      from, to, query: `1 ${from.query} in ${to.query}`, popular: popularPairKeys.has(`${from.symbol}\0${to.symbol}`)
    }))).map((pair, index) => ({ pair, index })).sort((a, b) => Number(b.pair.popular) - Number(a.pair.popular) || a.index - b.index).map(({ pair }) => pair);
    return { ...group, pairs };
  });
}

export function parseQuery(input) {
  const normalized = input.trim().replace(/[−–—]/g, '-').replace(/,/g, '');
  const match = normalized.match(/^([+-]?(?:(?:\d+:)?\d+(?::\d+(?:\.\d*)?)?|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?))\s+(.+?)\s+(?:in(?:to)?|to|as|→)\s+(.+?)\s*\??$/i);
  if (!match) return null;
  const clean = value => words(value).replace(/^degrees?\s+/, '');
  const clockParts = match[1].split(':').map(Number);
  const clockValue = clockParts.reduce((total, part) => total * 60 + part, 0);
  const paceUnit = (text, clockInput = false) => {
    const pace = clean(text).match(/^(?:(s|sec|second|min|minute|h|hr|hour)\s*)?\/\s*(?:(\d+(?:\.\d+)?)\s*)?(.+)$/);
    if (!pace) return null;
    const distance = Number(pace[2] || 1);
    const length = (byAlias.get(clean(pace[3])) || []).find(unit => unit.category === 'length');
    if (!length || !Number.isFinite(distance) || distance <= 0) return null;
    const timeSymbol = pace[1] || (clockInput || distance * length.factor <= 500 ? 'sec' : 'min');
    const seconds = clockInput ? 1 : /^(?:h|hr|hour)$/.test(timeSymbol) ? 3600 : /^(?:min|minute)$/.test(timeSymbol) ? 60 : 1;
    const distanceSymbol = `${pace[2] ? `${pace[2]} ` : ''}${length.symbol}`;
    return { category: 'pace', conversionGroup: 'pace-speed', symbol: `${pace[1] ? `${pace[1]}/` : '/'}${distanceSymbol}`, name: `${timeSymbol} per ${distanceSymbol}`, factor: seconds / (distance * length.factor) };
  };
  const fromPace = paceUnit(match[2], match[1].includes(':'));
  const toPace = paceUnit(match[3]);
  const fromMatches = fromPace ? [fromPace] : byAlias.get(clean(match[2])) || [];
  const toMatches = toPace ? [toPace] : byAlias.get(clean(match[3])) || [];
  const candidates = fromMatches.flatMap(from => toMatches.filter(to =>
    to.category === from.category && to.conversionGroup === from.conversionGroup ||
    from.conversionGroup === 'pace-speed' && to.conversionGroup === 'pace-speed'
  ).map(to => ({from,to})));
  if (!candidates.length) return null;
  const {from,to} = candidates[0];
  const clockUnitSeconds = from.category === 'pace' && !fromPace
    ? /^(?:min)\//.test(from.symbol) ? 60 : /^(?:h)\//.test(from.symbol) ? 3600 : 1
    : 1;
  const value = match[1].includes(':') ? clockValue / clockUnitSeconds : Number(match[1]);
  return Number.isFinite(value) ? { value, from, to, clockStyle: match[1].includes(':') } : null;
}

export function convert(value, from, to) {
  const paceToSpeed = from.conversionGroup === 'pace-speed' && to.conversionGroup === 'pace-speed' && from.category !== to.category;
  if (!paceToSpeed && (from.category !== to.category || from.conversionGroup !== to.conversionGroup)) throw new Error('Units must belong to the same conversion group');
  const base = from.toBase ? from.toBase(value) : value * from.factor;
  const compatibleBase = paceToSpeed ? 1 / base : base;
  return to.fromBase ? to.fromBase(compatibleBase) : compatibleBase / to.factor;
}
export function evaluate(input) { const parsed=parseQuery(input); return parsed ? {...parsed,result:convert(parsed.value,parsed.from,parsed.to)} : null; }
export function formatNumber(value) { if(!Number.isFinite(value))return String(value);if(Object.is(value,-0))value=0;const magnitude=Math.abs(value);if(magnitude!==0&&(magnitude>=1e12||magnitude<1e-7)){const [c,e]=value.toExponential(8).split('e');return `${c.replace(/\.?0+$/,'')}e${e}`;}return new Intl.NumberFormat('en-US',{maximumSignificantDigits:10}).format(value); }
export function formatValue(value, unit, clockStyle = false) {
  if (!clockStyle || unit?.category !== 'pace' || !Number.isFinite(value)) return formatNumber(value);
  const unitSeconds = /^min\//.test(unit.symbol) ? 60 : /^h\//.test(unit.symbol) ? 3600 : 1;
  const roundedSeconds = Math.round(Math.abs(value) * unitSeconds);
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor(roundedSeconds % 3600 / 60);
  const seconds = String(roundedSeconds % 60).padStart(2, '0');
  const clock = hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
  return value < 0 ? `-${clock}` : clock;
}
export function pairQuery(from,to,value=1) { return `${value} ${from.name || from.symbol} in ${to.name || to.symbol}`; }

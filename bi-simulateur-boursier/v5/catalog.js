const $=id=>document.getElementById(id);
const PRODUCTS={
 BTCUSDT:[
  {id:'IBIT',name:'iShares Bitcoin Trust ETF',kind:'ETF',ticker:'IBIT',isin:'US46438F1012',exchange:'Nasdaq',issuer:'BlackRock / iShares',desc:'ETF américain donnant une exposition au bitcoin détenu par le trust.',risk:'Volatilité du bitcoin, frais, garde et risque de marché.',source:'Fiche officielle émetteur'},
  {id:'FBTC',name:'Fidelity Wise Origin Bitcoin Fund',kind:'ETF',ticker:'FBTC',isin:'US3159481098',exchange:'Cboe BZX',issuer:'Fidelity',desc:'ETF spot américain exposé au bitcoin.',risk:'Volatilité élevée et risque lié à la conservation.',source:'Fiche officielle émetteur'},
  {id:'BITO',name:'ProShares Bitcoin Strategy ETF',kind:'ETF',ticker:'BITO',isin:'US74347G4405',exchange:'NYSE Arca',issuer:'ProShares',desc:'ETF fondé principalement sur des contrats futures bitcoin, et non sur la détention spot directe.',risk:'Rollover des futures, tracking error et volatilité.',source:'Fiche officielle émetteur'},
  {id:'BTCFUT',name:'CME Bitcoin Futures',kind:'Dérivé',ticker:'BTC',isin:'—',exchange:'CME',issuer:'CME Group',desc:'Contrat à terme standardisé sur une référence bitcoin.',risk:'Levier, marge, échéance et rollover.',source:'Spécification CME'}],
 ETHUSDT:[
  {id:'ETHA',name:'iShares Ethereum Trust ETF',kind:'ETF',ticker:'ETHA',isin:'US46438R1059',exchange:'Nasdaq',issuer:'BlackRock / iShares',desc:'ETF spot américain donnant une exposition à l’ether.',risk:'Volatilité, garde et frais.',source:'Fiche officielle émetteur'},
  {id:'FETH',name:'Fidelity Ethereum Fund',kind:'ETF',ticker:'FETH',isin:'US3159482088',exchange:'Cboe BZX',issuer:'Fidelity',desc:'ETF américain exposé au prix de l’ether.',risk:'Volatilité élevée et risque de marché.',source:'Fiche officielle émetteur'},
  {id:'ETHFUT',name:'CME Ether Futures',kind:'Dérivé',ticker:'ETH',isin:'—',exchange:'CME',issuer:'CME Group',desc:'Contrat à terme standardisé sur l’ether.',risk:'Levier, appels de marge et échéance.',source:'Spécification CME'}],
 NVDA:[
  {id:'SMH',name:'VanEck Semiconductor ETF',kind:'ETF',ticker:'SMH',isin:'US92189F6768',exchange:'Nasdaq',issuer:'VanEck',desc:'ETF sectoriel semi-conducteurs généralement fortement exposé aux grandes capitalisations du secteur, dont Nvidia.',risk:'Concentration sectorielle et pondération élevée de quelques titres.',source:'Fiche VanEck'},
  {id:'SOXX',name:'iShares Semiconductor ETF',kind:'ETF',ticker:'SOXX',isin:'US4642875235',exchange:'Nasdaq',issuer:'BlackRock / iShares',desc:'ETF suivant un indice d’entreprises américaines de semi-conducteurs.',risk:'Volatilité sectorielle et concentration.',source:'Fiche iShares'},
  {id:'QQQ',name:'Invesco QQQ Trust',kind:'ETF',ticker:'QQQ',isin:'US46090E1038',exchange:'Nasdaq',issuer:'Invesco',desc:'ETF répliquant le Nasdaq-100, qui peut détenir Nvidia avec une pondération variable.',risk:'Concentration croissance/technologie.',source:'Fiche Invesco'},
  {id:'NVDL',name:'GraniteShares 2x Long NVDA Daily ETF',kind:'Levier',ticker:'NVDL',isin:'US38747R8279',exchange:'Nasdaq',issuer:'GraniteShares',desc:'ETF visant environ deux fois la performance quotidienne de Nvidia.',risk:'Très élevé; levier quotidien et effet de composition.',source:'Fiche émetteur'},
  {id:'NVDS',name:'AXS 1.25X NVDA Bear Daily ETF',kind:'Levier',ticker:'NVDS',isin:'US46144X4799',exchange:'Nasdaq',issuer:'AXS Investments',desc:'ETF visant une performance quotidienne inverse et amplifiée de Nvidia.',risk:'Très élevé; produit baissier quotidien.',source:'Fiche émetteur'}],
 AAPL:[
  {id:'QQQ',name:'Invesco QQQ Trust',kind:'ETF',ticker:'QQQ',isin:'US46090E1038',exchange:'Nasdaq',issuer:'Invesco',desc:'ETF Nasdaq-100 comprenant généralement Apple.',risk:'Concentration technologique.',source:'Fiche Invesco'},
  {id:'VGT',name:'Vanguard Information Technology ETF',kind:'ETF',ticker:'VGT',isin:'US92204A7028',exchange:'NYSE Arca',issuer:'Vanguard',desc:'ETF technologie américaine pouvant présenter une exposition importante à Apple.',risk:'Concentration sectorielle.',source:'Fiche Vanguard'},
  {id:'XLK',name:'Technology Select Sector SPDR Fund',kind:'ETF',ticker:'XLK',isin:'US81369Y8030',exchange:'NYSE Arca',issuer:'State Street',desc:'ETF sectoriel technologique américain.',risk:'Concentration sur les grandes valeurs technologiques.',source:'Fiche SPDR'}],
 'MC.PA':[
  {id:'CACC',name:'Amundi CAC 40 UCITS ETF Acc',kind:'ETF',ticker:'CACC',isin:'FR0013380607',exchange:'Euronext Paris',issuer:'Amundi',desc:'ETF UCITS répliquant le CAC 40, pouvant détenir LVMH selon la composition de l’indice.',risk:'Risque actions françaises et tracking error.',source:'Fiche Amundi'},
  {id:'CAC',name:'Amundi CAC 40 UCITS ETF Dist',kind:'ETF',ticker:'CAC',isin:'FR0007052782',exchange:'Euronext Paris',issuer:'Amundi',desc:'ETF distribuant répliquant l’indice CAC 40.',risk:'Risque de marché France.',source:'Fiche Amundi'},
  {id:'LUXU',name:'Amundi S&P Global Luxury UCITS ETF',kind:'ETF',ticker:'LUXU',isin:'LU1681048630',exchange:'Euronext / Xetra selon ligne',issuer:'Amundi',desc:'ETF thématique exposé aux sociétés mondiales du luxe.',risk:'Concentration thématique et risque de change.',source:'Fiche Amundi'}],
 QQQ:[
  {id:'QQQM',name:'Invesco NASDAQ 100 ETF',kind:'ETF',ticker:'QQQM',isin:'US46138G6492',exchange:'Nasdaq',issuer:'Invesco',desc:'ETF suivant le Nasdaq-100 avec une structure distincte de QQQ.',risk:'Concentration technologique.',source:'Fiche Invesco'},
  {id:'TQQQ',name:'ProShares UltraPro QQQ',kind:'Levier',ticker:'TQQQ',isin:'US74347X8314',exchange:'Nasdaq',issuer:'ProShares',desc:'ETF visant trois fois la performance quotidienne du Nasdaq-100.',risk:'Très élevé; levier quotidien et effet de composition.',source:'Fiche ProShares'},
  {id:'SQQQ',name:'ProShares UltraPro Short QQQ',kind:'Levier',ticker:'SQQQ',isin:'US74347G4322',exchange:'Nasdaq',issuer:'ProShares',desc:'ETF visant trois fois l’inverse de la performance quotidienne du Nasdaq-100.',risk:'Très élevé; exposition inverse quotidienne.',source:'Fiche ProShares'},
  {id:'NQFUT',name:'E-mini Nasdaq-100 Futures',kind:'Dérivé',ticker:'NQ',isin:'—',exchange:'CME',issuer:'CME Group',desc:'Contrat à terme sur le Nasdaq-100.',risk:'Levier, marge et échéance.',source:'Spécification CME'}]
};
const DATA=[
 {cat:'Crypto',sym:'BTCUSDT',name:'Bitcoin',type:'Crypto-actif',risk:'Très élevé',desc:'Actif numérique décentralisé.',currency:'USD'},
 {cat:'Crypto',sym:'ETHUSDT',name:'Ethereum',type:'Crypto-actif',risk:'Très élevé',desc:'Blockchain programmable.',currency:'USD'},
 {cat:'US Tech',sym:'NVDA',name:'Nvidia',type:'Action',risk:'Élevé',desc:'Semi-conducteurs et calcul accéléré.',currency:'USD'},
 {cat:'US Tech',sym:'AAPL',name:'Apple',type:'Action',risk:'Moyen/élevé',desc:'Matériel, logiciels et services numériques.',currency:'USD'},
 {cat:'CAC 40',sym:'MC.PA',name:'LVMH',type:'Action',risk:'Moyen/élevé',desc:'Groupe mondial du luxe.',currency:'EUR'},
 {cat:'ETF',sym:'QQQ',name:'Invesco QQQ Trust',type:'ETF',risk:'Élevé',desc:'ETF répliquant le Nasdaq-100.',currency:'USD'}
];
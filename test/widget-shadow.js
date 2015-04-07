var blessed = require('../')
  , screen;

screen = blessed.screen({
  dump: __dirname + '/logs/shadow.log',
  smartCSR: true,
  dockBorders: true
});

var bg = blessed.box({
  parent: screen,
  shadow: true,
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  style: {
    bg: 'lightblue'
  },
  content: 'Foo'
});

var over = blessed.box({
  parent: screen,
  shadow: true,
  left: 'center',
  top: 'center',
  width: '50%',
  height: '50%',
  style: {
    bg: 'red'
  },
  content: 'Foo'
});

screen.key('q', function() {
  return process.exit(0);
});

var lorem = 'Non eram nescius Brute cum quae summis ingeniis exquisitaque'
+ ' doctrina philosophi Graeco sermone tractavissent ea Latinis litteris mandaremus'
+ ' fore ut hic noster labor in varias reprehensiones incurreret nam quibusdam et'
+ ' iis quidem non admodum indoctis totum hoc displicet philosophari quidam autem'
+ ' non tam id reprehendunt si remissius agatur sed tantum studium tamque multam'
+ ' operam ponendam in eo non arbitrantur erunt etiam et ii quidem eruditi Graecis'
+ ' litteris contemnentes Latinas qui se dicant in Graecis legendis operam malle'
+ ' consumere postremo aliquos futuros suspicor qui me ad alias litteras vocent'
+ ' genus hoc scribendi etsi sit elegans personae tamen et dignitatis esse negent'
+ ' Contra quos omnis dicendum breviter existimo Quamquam philosophiae quidem'
+ ' vituperatoribus satis responsum est eo libro quo a nobis philosophia defensa et'
+ ' collaudata est cum esset accusata et vituperata ab Hortensio qui liber cum et'
+ ' tibi probatus videretur et iis quos ego posse iudicare arbitrarer plura suscepi'
+ ' veritus ne movere hominum studia viderer retinere non posse Qui autem si maxime'
+ ' hoc placeat moderatius tamen id volunt fieri difficilem quandam temperantiam'
+ ' postulant in eo quod semel admissum coerceri reprimique non potest ut'
+ ' propemodum iustioribus utamur illis qui omnino avocent a philosophia quam his'
+ ' qui rebus infinitis modum constituant in reque eo meliore quo maior sit'
+ ' mediocritatem desiderent Sive enim ad sapientiam perveniri potest non paranda'
+ ' nobis solum ea sed fruenda etiam sapientia est sive hoc difficile est tamen nec'
+ ' modus est ullus investigandi veri nisi inveneris et quaerendi defatigatio'
+ ' turpis est cum id quod quaeritur sit pulcherrimum etenim si delectamur cum'
+ ' scribimus quis est tam invidus qui ab eo nos abducat sin laboramus quis est qui'
+ ' alienae modum statuat industriae nam ut Terentianus Chremes non inhumanus qui'
+ ' novum vicinum non vult fodere aut arare aut aliquid ferre denique non enim'
+ ' illum ab industria sed ab inliberali labore deterret sic isti curiosi quos'
+ ' offendit noster minime nobis iniucundus labor Iis igitur est difficilius satis'
+ ' facere qui se Latina scripta dicunt contemnere in quibus hoc primum est in quo'
+ ' admirer cur in gravissimis rebus non delectet eos sermo patrius cum idem'
+ ' fabellas Latinas ad verbum e Graecis expressas non inviti legant quis enim tam'
+ ' inimicus paene nomini Romano est qui Ennii Medeam aut Antiopam Pacuvii spernat'
+ ' aut reiciat quod se isdem Euripidis fabulis delectari dicat Latinas litteras'
+ ' oderit Quid si nos non interpretum fungimur munere sed tuemur ea quae dicta'
+ ' sunt ab iis quos probamus eisque nostrum iudicium et nostrum scribendi ordinem'
+ ' adiungimus quid habent cur Graeca anteponant iis quae et splendide dicta sint'
+ ' neque sint conversa de Graecis nam si dicent ab illis has res esse tractatas ne'
+ ' ipsos quidem Graecos est cur tam multos legant quam legendi sunt quid enim est'
+ ' a Chrysippo praetermissum in Stoicis legimus tamen Diogenem Antipatrum'
+ ' Mnesarchum Panaetium multos alios in primisque familiarem nostrum Posidonium'
+ ' quid Theophrastus mediocriterne delectat cum tractat locos ab Aristotele ante'
+ ' tractatos quid Epicurei num desistunt de isdem de quibus et ab Epicuro scriptum'
+ ' est et ab antiquis ad arbitrium suum scribere quodsi Graeci leguntur a Graecis'
+ ' isdem de rebus alia ratione compositis quid est cur nostri a nostris non'
+ ' legantur';

bg.setContent(lorem);

screen.render();

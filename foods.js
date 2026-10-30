/* Qomat: ovqatlar ro'yxati (AI'siz qo'shish uchun). Qiymatlar 100 g uchun o'rtacha: ochiq ozuqaviy jadvallar
   (USDA, Skurixin jadvallari) va odatiy o'zbek retseptlari asosida. Uy ovqatida yog' va porsiya farq qiladi, shuning
   uchun bu taxminiy hisob.
   Qator: nom | qidiruv uchun boshqa nomlar | kkal | oqsil | yog' | uglevod | porsiyalar ("nom:gramm", vergul bilan) */
window.FOOD_CATS = [
  ["m", "🍲", "Milliy taomlar"], ["n", "🍞", "Non, xamir, garnir"], ["s", "🥛", "Sut mahsulotlari"],
  ["g", "🥩", "Go'sht, baliq, tuxum"], ["v", "🥗", "Sabzavot va salatlar"], ["f", "🍎", "Meva va yong'oq"],
  ["i", "🥤", "Ichimliklar"], ["sh", "🍰", "Shirinliklar"], ["x", "🍔", "Fast-fud"], ["y", "🧈", "Yog' va souslar"],
];
window.FOODS_RAW = `
#m
Somsa (kartoshkali) | samsa kartoshka | 230 | 4 | 10 | 30 | dona:110
Manti (tovuqli) | manti tovuq | 200 | 10 | 9 | 20 | dona:55, 5 dona:275
Jarkop | jarkop jarkob | 150 | 8 | 10 | 7 | likopcha:300
Palov (osh) | plov palov osh плов ош | 195 | 6 | 11 | 19 | kosa:350, likopcha:300
To'y oshi | toy oshi plov | 210 | 6 | 12 | 20 | kosa:350, likopcha:300
Tovuqli palov | tovuq osh plov | 165 | 8 | 7 | 18 | kosa:350
Shivit oshi | shivit osh | 175 | 6 | 8 | 20 | likopcha:300
Mosh xo'rda | moshxorda mosh shorva | 95 | 4 | 3 | 13 | kosa:400
Moshkichiri | mosh kichiri | 150 | 6 | 5 | 21 | likopcha:300
Shovla | shavla | 140 | 5 | 5 | 19 | likopcha:300
Mastava | мастава | 75 | 3 | 3 | 9 | kosa:400
Sho'rva (go'shtli) | shurva shorpa шурпа суп | 70 | 4 | 4 | 5 | kosa:400
Qaynatma sho'rva | shurva qaynatma | 60 | 5 | 3 | 3 | kosa:400
Tovuq sho'rva | tovuq shurva sup бульон | 45 | 4 | 2 | 3 | kosa:400
Lag'mon (suyuq) | lagmon лагман | 110 | 5 | 4 | 13 | kosa:450
Qovurma lag'mon | lagmon qovurma | 170 | 7 | 7 | 20 | likopcha:350
Manti (go'shtli) | manti манты | 230 | 10 | 12 | 20 | dona:55, 5 dona:275
Manti (qovoqli) | manti qovoq | 140 | 3 | 4 | 22 | dona:60, 5 dona:300
Manti (kartoshkali) | manti kartoshka | 160 | 4 | 5 | 25 | dona:60, 5 dona:300
Tuxum barak | barak | 190 | 8 | 8 | 22 | 10 dona:150
Chuchvara (sho'rvali) | chuchvara tushbera чучвара пельмени | 120 | 6 | 5 | 13 | kosa:350
Qovurilgan chuchvara | chuchvara | 260 | 10 | 14 | 24 | likopcha:250
Somsa (go'shtli, tandir) | samsa somsa самса | 300 | 9 | 17 | 28 | dona:120
Somsa (tovuqli) | samsa somsa | 280 | 10 | 15 | 27 | dona:110
Somsa (qovoqli) | samsa qovoq | 220 | 4 | 10 | 29 | dona:110
Somsa (ko'kat) | samsa kokat | 230 | 5 | 11 | 28 | dona:100
Varaqi somsa | samsa qatlama | 330 | 9 | 20 | 29 | dona:120
Go'shtli non | goshtli non | 280 | 10 | 13 | 30 | bo'lak:150
Norin | norin нарын | 230 | 12 | 9 | 25 | likopcha:250
Dimlama | dimlama димляма | 95 | 5 | 5 | 8 | likopcha:400
Qozon kabob | kazan kabob | 220 | 12 | 15 | 10 | likopcha:300
Qovurma (go'sht, kartoshka) | qovurma | 180 | 9 | 11 | 12 | likopcha:300
Kabob (qiyma) | lyulya kabob shashlik | 260 | 16 | 20 | 3 | six:70
Shashlik (mol go'shti) | shashlik kabob шашлык | 220 | 22 | 14 | 1 | six:80
Shashlik (qo'y go'shti) | shashlik kabob qoy | 260 | 20 | 20 | 1 | six:80
Shashlik (tovuq) | shashlik kabob tovuq | 170 | 22 | 8 | 1 | six:80
Jigar kabob | jigar shashlik | 190 | 20 | 10 | 4 | six:70
Tandir go'sht | tandir gosht | 280 | 22 | 21 | 0 | porsiya:200
Jiz | jiz qovurilgan gosht | 300 | 18 | 25 | 2 | likopcha:200
Qazi | qazi kazy | 400 | 15 | 38 | 0 | bo'lak:30
Xasip | hasip | 320 | 10 | 28 | 6 | bo'lak:100
Beshbarmoq | beshbarmak | 210 | 12 | 11 | 16 | likopcha:350
Halim | halim xalim | 140 | 9 | 5 | 15 | kosa:350
Sumalak | sumalak | 240 | 4 | 1 | 54 | piyola:150
Chalop | chalob | 30 | 1.5 | 1 | 3.5 | kosa:350
Okroshka | okroshka окрошка | 70 | 3 | 3 | 7 | kosa:350
Xonim | honim | 200 | 8 | 9 | 22 | bo'lak:150
Gumma | gumma pirojki | 280 | 8 | 14 | 30 | dona:90
Kuksi | kuksi | 80 | 4 | 2 | 11 | kosa:450
Ugra osh | ugra | 75 | 4 | 2 | 10 | kosa:400
Mampar | mampar | 90 | 4 | 3 | 12 | kosa:400
Dolma | dolma tolma | 150 | 8 | 9 | 9 | dona:50
Tovuq qanoti (qovurilgan) | qanot krilishki | 260 | 20 | 19 | 2 | dona:40
Bo'g'irsoq | bogirsoq | 400 | 7 | 20 | 48 | hovuch:50
Chalpak | chalpak | 330 | 7 | 14 | 44 | dona:60
#n
Tost non | tost тостовый хлеб | 265 | 8 | 3.5 | 50 | bo'lak:25
Galeta (krekker) | kreker galeta крекер | 400 | 11 | 10 | 68 | dona:10
Kuskus | kuskus кускус | 112 | 3.8 | 0.2 | 23 | likopcha:200
Obi non | non lepyoshka лепешка | 260 | 8 | 2 | 52 | chorak:100, yarim:200, butun:400
Patir non | patir | 330 | 8 | 10 | 52 | chorak:100, butun:400
Kepakli non | kepakli non отрубной | 230 | 9 | 3 | 43 | bo'lak:40
Qora non | javdar non черный хлеб | 210 | 7 | 1.5 | 42 | bo'lak:35
Oq non (buxanka) | buxanka xleb хлеб | 265 | 8 | 3 | 50 | bo'lak:30
Baton | baton батон | 260 | 8 | 3 | 51 | bo'lak:30
Lavash (yupqa non) | lavash лаваш | 275 | 9 | 1.5 | 56 | dona:80
Qatlama | qatlama | 360 | 7 | 18 | 43 | dona:120
Lochira | lochira | 280 | 7 | 8 | 45 | dona:80
Bulochka | bulka булочка | 300 | 8 | 6 | 53 | dona:60
Sosiskali bulochka | sosiska v teste | 280 | 9 | 14 | 30 | dona:90
Pirojki (kartoshkali) | pirojki пирожок | 250 | 5 | 10 | 35 | dona:80
Pirojki (go'shtli) | pirojki пирожок | 280 | 10 | 13 | 31 | dona:90
Belyash | belyash беляш | 300 | 11 | 17 | 26 | dona:100
Cheburek | chebureki чебурек | 300 | 10 | 17 | 27 | dona:120
Pelmen | pelmen пельмени | 250 | 11 | 12 | 25 | 10 dona:120, porsiya:250
Varenik (kartoshkali) | varenik вареники | 180 | 5 | 4 | 31 | 10 dona:150
Blinchik | blin блины | 220 | 6 | 8 | 30 | dona:50
Blinchik (go'shtli) | blin блинчики | 220 | 9 | 10 | 22 | dona:90
Quymoq (oladya) | oladi оладьи | 230 | 6 | 8 | 33 | dona:40
Sirniki | syrniki сырники | 220 | 15 | 9 | 20 | dona:60
Makaron (qaynatilgan) | makaron макароны spagetti | 130 | 5 | 1 | 26 | likopcha:200
Makaron (qiymali) | po flotski | 190 | 9 | 8 | 21 | likopcha:300
Guruch (qaynatilgan) | ris guruch рис | 130 | 2.7 | 0.3 | 28 | likopcha:180
Grechka (qaynatilgan) | grechka гречка | 110 | 4 | 1 | 21 | likopcha:200
Perlovka | perlovka перловка | 120 | 3 | 0.4 | 26 | likopcha:200
Bulg'ur | bulgur булгур | 85 | 3 | 0.2 | 19 | likopcha:200
Suli bo'tqasi (suvda) | ovsyanka gerkules каша | 90 | 3 | 1.5 | 15 | likopcha:250
Suli bo'tqasi (sutda) | ovsyanka gerkules каша | 115 | 4 | 3 | 17 | likopcha:250
Manniy bo'tqa | mannaya kasha манка | 100 | 3 | 3 | 15 | likopcha:250
Shirguruch | sutli guruch каша | 110 | 3 | 3 | 17 | kosa:300
Kartoshka (qaynatilgan) | kartoshka картофель | 80 | 2 | 0.4 | 17 | dona:120
Kartoshka pyuresi | pyure пюре | 105 | 2.5 | 4 | 15 | likopcha:200
Qovurilgan kartoshka | kartoshka qovurma жареный | 190 | 3 | 10 | 22 | likopcha:200
Makkajo'xori (so'ta) | kukuruza makka | 100 | 3.4 | 1.5 | 21 | dona:150
Mosh (qaynatilgan) | mosh маш | 105 | 7 | 0.4 | 19 | likopcha:200
Loviya (qaynatilgan) | loviya фасоль | 125 | 8 | 0.5 | 22 | likopcha:200
No'xat (qaynatilgan) | noxat нут | 165 | 9 | 2.6 | 27 | likopcha:150
Yasmiq (qaynatilgan) | chechevitsa чечевица | 115 | 9 | 0.4 | 20 | likopcha:200
#s
Sut (1,5%) | sut moloko молоко | 45 | 3 | 1.5 | 4.8 | stakan:250
Motsarella | mozzarella моцарелла | 280 | 22 | 20 | 2 | bo'lak:30
Tvorogli zapekanka | zapekanka запеканка | 200 | 15 | 7 | 19 | bo'lak:150
Sut (2,5%) | sut moloko молоко | 52 | 2.8 | 2.5 | 4.7 | stakan:250, piyola:150
Sut (3,2%) | sut moloko молоко | 60 | 2.9 | 3.2 | 4.7 | stakan:250
Qatiq | qatiq katyk катык | 60 | 3 | 3 | 4 | kosa:250, stakan:200
Kefir | kefir кефир | 50 | 3 | 2.5 | 4 | stakan:250
Ryajenka | ryajenka ряженка | 67 | 3 | 4 | 4 | stakan:250
Suzma | suzma сузьма | 190 | 10 | 15 | 4 | osh qoshiq:25, piyola:100
Tvorog (5%) | tvorog творог | 120 | 17 | 5 | 2 | porsiya:150
Tvorog (9%) | tvorog творог | 160 | 16 | 9 | 2 | porsiya:150
Qaymoq | qaymoq kaymak сливки | 340 | 2.5 | 35 | 3 | osh qoshiq:20
Smetana (15%) | smetana сметана | 160 | 2.6 | 15 | 3 | osh qoshiq:20
Smetana (20%) | smetana сметана | 205 | 2.5 | 20 | 3.4 | osh qoshiq:20
Pishloq (qattiq) | pishloq syr сыр | 360 | 25 | 28 | 0 | bo'lak:20
Brinza | brinza брынза | 260 | 18 | 20 | 0.5 | bo'lak:30
Eritilgan pishloq | plavlenniy syr | 260 | 10 | 22 | 5 | dona:15
Yogurt (shirin) | yogurt йогурт | 85 | 3 | 2.5 | 13 | stakancha:125
Yogurt (shakarsiz, quyuq) | grek yogurt | 73 | 10 | 2 | 4 | stakancha:150
Qurt | qurt kurt курт | 330 | 35 | 17 | 8 | dona:10
Quyultirilgan sut | sgushenka сгущенка | 320 | 7 | 8.5 | 56 | osh qoshiq:20
#g
Kurka go'shti | indeyka индейка | 135 | 29 | 2 | 0 | porsiya:150
Tovuq kotleti | kotlet tovuq | 200 | 18 | 11 | 7 | dona:80
Qizil baliq (losos) | losos semga лосось | 200 | 22 | 13 | 0 | porsiya:150
Krevetka | krevetki креветки | 100 | 20 | 1.5 | 0 | porsiya:100
Tuxum (qaynatilgan) | tuxum яйцо | 155 | 13 | 11 | 1 | dona:50
Tuxum (qovurilgan) | tuxum yaichnitsa глазунья | 195 | 13.6 | 15 | 1 | dona:55
Omlet | omlet омлет | 160 | 10 | 12 | 2 | 2 tuxumli:130
Mol go'shti (qaynatilgan) | mol gosht говядина | 250 | 26 | 16 | 0 | porsiya:100
Qo'y go'shti (qaynatilgan) | qoy gosht баранина | 290 | 24 | 21 | 0 | porsiya:100
Tovuq ko'kragi (qaynatilgan) | tovuq grudka курица | 150 | 30 | 3 | 0 | porsiya:150
Tovuq soni (qovurilgan) | tovuq son бедро | 230 | 24 | 15 | 0 | dona:120
Tovuq (grill) | tovuq grill курица гриль | 210 | 25 | 12 | 0 | chorak:200
Kotlet | kotlet котлета | 250 | 15 | 17 | 9 | dona:80
Tefteli | tefteli тефтели | 190 | 12 | 12 | 8 | dona:50
Qiyma (qovurilgan) | farsh qiyma фарш | 280 | 18 | 22 | 0 | porsiya:100
Jigar (qovurilgan) | jigar печень | 200 | 22 | 10 | 4 | porsiya:100
Kolbasa (qaynatilgan) | kolbasa varyonka колбаса | 260 | 12 | 23 | 1.5 | bo'lak:20
Kolbasa (dudlangan) | kolbasa kopchenaya | 400 | 20 | 35 | 0 | bo'lak:15
Sosiska | sosiska сосиска | 260 | 11 | 23 | 1.5 | dona:50
Baliq (qovurilgan) | baliq рыба | 200 | 18 | 11 | 6 | porsiya:150
Baliq (qaynatilgan, bug'da) | baliq рыба | 110 | 20 | 3 | 0 | porsiya:150
Seld (tuzlangan) | seld селедка | 220 | 17 | 16 | 0 | bo'lak:30
Tunets (konserva) | tunets тунец | 100 | 23 | 1 | 0 | banka:130
Krab tayoqchalari | krab палочки | 90 | 6 | 1 | 14 | dona:15
#v
Brokkoli | brokkoli брокколи | 35 | 2.4 | 0.4 | 7 | porsiya:150
Gulkaram | tsvetnaya kapusta цветная | 30 | 2.5 | 0.3 | 5 | porsiya:150
Ismaloq | shpinat шпинат | 23 | 2.9 | 0.4 | 2 | porsiya:100
Sarimsoq | sarimsoq чеснок | 150 | 6.5 | 0.5 | 30 | tishcha:5
Grek salati | grecheskiy salat греческий | 110 | 3.5 | 9 | 4 | likopcha:200
Achchiq-chuchuk | achchiq chuchuk salat pomidor piyoz | 40 | 1 | 2.5 | 4 | likopcha:150
Bodring va pomidor salati | salat bodring pomidor | 70 | 1 | 5 | 4 | likopcha:150
Karam salati | salat karam капуста | 60 | 1.5 | 4 | 5 | likopcha:150
Koreyscha sabzi | sabzi salat морковь корейская | 130 | 1.3 | 10 | 9 | likopcha:100
Vinegret | vinegret винегрет | 75 | 1.5 | 4.5 | 8 | likopcha:150
Olivye | olivye salat оливье | 190 | 5 | 16 | 7 | likopcha:150
Sezar salati | sezar цезарь | 190 | 10 | 14 | 7 | likopcha:200
Lavlagi salati (mayonezli) | svekla salat свекла | 130 | 1.5 | 10 | 9 | likopcha:150
Bodring | bodring огурец | 15 | 0.8 | 0.1 | 3 | dona:100
Pomidor | pomidor помидор | 20 | 0.9 | 0.2 | 4 | dona:120
Bulg'or qalampiri | qalampir перец | 27 | 1 | 0.3 | 6 | dona:150
Karam | karam капуста | 28 | 1.8 | 0.1 | 5 | porsiya:100
Sabzi | sabzi морковь | 35 | 1 | 0.2 | 8 | dona:80
Piyoz | piyoz лук | 40 | 1.1 | 0.1 | 9 | dona:100
Turp (rediska) | rediska редиска | 20 | 1 | 0.1 | 3.4 | 5 dona:100
Lavlagi (qaynatilgan) | svekla свекла | 49 | 1.7 | 0.2 | 10 | dona:150
Ko'kat | kokat ukrop petrushka зелень | 40 | 3 | 0.5 | 7 | bog':30
Qovoq (dimlangan) | qovoq тыква | 40 | 1 | 0.1 | 9 | likopcha:200
Baqlajon (qovurilgan) | baqlajon баклажан | 130 | 1 | 10 | 8 | likopcha:150
Qo'ziqorin (qovurilgan) | qoziqorin грибы | 160 | 4 | 14 | 4 | porsiya:150
Tuzlangan bodring | solenie огурцы | 15 | 0.8 | 0.1 | 2 | dona:60
Ko'k no'xat (konserva) | goroshek горошек | 60 | 3.5 | 0.2 | 10 | porsiya:100
Makkajo'xori (konserva) | kukuruza кукуруза | 100 | 2.5 | 1 | 19 | porsiya:100
Zaytun | zaytun маслины оливки | 145 | 1 | 15 | 4 | 10 dona:40
Kabachok ikrasi | ikra кабачковая | 90 | 1.2 | 7 | 7 | porsiya:100
#f
Qoraqat | smorodina смородина | 44 | 1 | 0.4 | 7.5 | hovuch:100
Mango | mango манго | 60 | 0.8 | 0.4 | 15 | dona:200
Pomelo | pomelo помело | 38 | 0.8 | 0 | 9.6 | bo'lak:150
Olma | olma яблоко | 47 | 0.4 | 0.4 | 10 | dona:180
Nok | nok груша | 47 | 0.4 | 0.3 | 11 | dona:170
Banan | banan банан | 95 | 1.5 | 0.2 | 22 | dona:120
Apelsin | apelsin апельсин | 43 | 0.9 | 0.2 | 8 | dona:180
Mandarin | mandarin мандарин | 38 | 0.8 | 0.2 | 8 | dona:70
Uzum | uzum виноград | 70 | 0.6 | 0.2 | 17 | shingil:150
Anor | anor гранат | 72 | 0.9 | 0.6 | 14 | dona:200
Xurmo | xurmo hurmo хурма | 67 | 0.5 | 0.4 | 15 | dona:200
Anjir | anjir инжир | 74 | 0.7 | 0.2 | 14 | dona:50
O'rik | orik абрикос | 44 | 0.9 | 0.1 | 9 | dona:35
Shaftoli | shaftoli персик | 45 | 0.9 | 0.1 | 10 | dona:130
Olcha | olcha вишня | 52 | 0.8 | 0.5 | 10 | hovuch:100
Gilos | gilos черешня | 52 | 1.1 | 0.4 | 11 | hovuch:100
Qulupnay | qulupnay клубника | 41 | 0.8 | 0.4 | 7.5 | hovuch:100
Malina | malina малина | 46 | 0.8 | 0.5 | 8 | hovuch:100
Olxo'ri | olxori слива | 49 | 0.8 | 0.3 | 10 | dona:30
Tarvuz | tarvuz арбуз | 27 | 0.6 | 0.1 | 6 | bo'lak:300
Qovun | qovun дыня | 35 | 0.6 | 0.3 | 7.4 | bo'lak:250
Behi | behi айва | 48 | 0.6 | 0.5 | 10 | dona:200
Limon | limon лимон | 29 | 1.1 | 0.3 | 6.5 | bo'lak:10
Kivi | kivi киви | 50 | 1 | 0.6 | 10 | dona:75
Ananas | ananas ананас | 52 | 0.4 | 0.2 | 12 | bo'lak:100
Greypfrut | greypfrut грейпфрут | 35 | 0.7 | 0.2 | 6.5 | yarim:150
Avokado | avokado авокадо | 160 | 2 | 15 | 2 | dona:150
Mayiz | mayiz изюм | 265 | 2.9 | 0.6 | 66 | hovuch:30
Turshak | turshak quritilgan orik курага | 240 | 5 | 0.4 | 51 | hovuch:30
Xurmo (quritilgan) | finik финики | 280 | 2.5 | 0.5 | 69 | dona:8
Qora olxo'ri (quritilgan) | chernosliv чернослив | 230 | 2.3 | 0.7 | 58 | hovuch:30
Yong'oq | yongoq грецкий орех | 650 | 15 | 65 | 7 | hovuch:30
Bodom | bodom миндаль | 600 | 19 | 54 | 13 | hovuch:30
Fistashka | pista фисташки | 560 | 20 | 45 | 28 | hovuch:30
Yeryong'oq | arahis арахис | 550 | 26 | 45 | 10 | hovuch:30
Kungaboqar pistasi | semechka pista семечки | 580 | 21 | 52 | 11 | hovuch:30
Qovoq urug'i | qovoq pista тыквенные семечки | 560 | 24 | 46 | 13 | hovuch:30
#i
Sutli kokteyl | kokteyl milkshake молочный коктейль | 110 | 3 | 3.5 | 17 | stakan:300
Ko'k choy (shakarsiz) | choy chay чай | 1 | 0 | 0 | 0 | piyola:150, stakan:250
Qora choy (shakarsiz) | choy chay чай | 1 | 0 | 0 | 0 | piyola:150, stakan:250
Choy, shakar bilan | choy shakar | 13 | 0 | 0 | 3.3 | piyola:150, stakan:250
Sutli choy | choy sut | 20 | 0.8 | 0.8 | 1.2 | piyola:150, stakan:250
Qahva (qora) | qahva kofe кофе | 2 | 0.2 | 0 | 0.3 | chashka:150
Kofe 3 in 1 | kofe 3v1 | 39 | 0.5 | 1.5 | 6 | paket:180
Kapuchino | kapuchino латте капучино | 45 | 2.4 | 2.2 | 4 | stakan:250
Kakao (sutli) | kakao какао | 75 | 3 | 3 | 9 | stakan:250
Kompot | kompot компот | 40 | 0.2 | 0 | 10 | stakan:250
Sharbat (paketdagi) | sok sharbat сок | 45 | 0.5 | 0 | 10 | stakan:250
Apelsin sharbati (yangi) | fresh sok | 45 | 0.7 | 0.2 | 10 | stakan:250
Gazli ichimlik (shirin) | kola cola fanta pepsi газировка | 42 | 0 | 0 | 10.5 | stakan:250, banka:330, yarim litr:500
Gazli ichimlik (shakarsiz) | zero light | 0.4 | 0 | 0 | 0 | banka:330
Energetik ichimlik | energetik энергетик | 45 | 0 | 0 | 11 | banka:250
Ayron | ayron айран | 30 | 1.5 | 1.5 | 2 | stakan:250
Kvas | kvas квас | 27 | 0.2 | 0 | 6.5 | stakan:250
Smuzi (mevali) | smuzi смузи | 55 | 1 | 0.5 | 12 | stakan:300
Suv | mineral suv вода | 0 | 0 | 0 | 0 | stakan:250
#sh
Pirojnoe | pirojnoe пирожное | 400 | 5 | 22 | 45 | dona:60
Tiramisu | tiramisu тирамису | 300 | 6 | 20 | 25 | bo'lak:100
Shakar | shakar сахар | 400 | 0 | 0 | 100 | choy qoshiq:5, bo'lak:5
Asal | asal мед | 330 | 0.8 | 0 | 81 | choy qoshiq:10, osh qoshiq:25
Murabbo | murabbo варенье джем | 260 | 0.3 | 0.1 | 65 | osh qoshiq:20
Navvot | navvot | 390 | 0 | 0 | 98 | bo'lak:10
Parvarda | parvarda | 380 | 0.5 | 1 | 94 | dona:8
Holva | halva xalva халва | 520 | 12 | 30 | 54 | bo'lak:30
Chak-chak | chakchak чак-чак | 450 | 6 | 22 | 57 | bo'lak:50
Pahlava | paxlava пахлава | 420 | 6 | 25 | 44 | bo'lak:60
Nisholda | nishalda | 300 | 2 | 0 | 75 | osh qoshiq:30
Shokolad (sutli) | shokolad шоколад | 550 | 7 | 34 | 54 | bo'lak:25, plitka:100
Shokolad (achchiq) | shokolad qora горький | 540 | 6 | 35 | 48 | bo'lak:25, plitka:100
Shokoladli batoncha | snikers twix батончик | 490 | 8 | 24 | 60 | dona:50
Konfet (shokoladli) | konfet конфеты | 480 | 4 | 25 | 60 | dona:12
Karamel | konfet karamel карамель | 380 | 0 | 0.1 | 95 | dona:6
Pechenye | pechene печенье | 420 | 7 | 12 | 72 | dona:10
Pechenye (shokoladli) | pechene печенье | 470 | 6 | 22 | 63 | dona:12
Vafli | vafli вафли | 520 | 4 | 30 | 60 | dona:20
Tort (kremli) | tort торт | 380 | 5 | 20 | 45 | bo'lak:100
Napoleon | napoleon наполеон | 400 | 6 | 25 | 40 | bo'lak:100
Medovik | medovik медовик | 380 | 5 | 17 | 52 | bo'lak:100
Keks | keks кекс | 400 | 6 | 18 | 55 | bo'lak:60
Kruassan | kruassan круассан | 400 | 8 | 21 | 45 | dona:60
Ponchik | ponchik пончик | 300 | 6 | 15 | 38 | dona:60
Zefir | zefir зефир | 320 | 0.8 | 0.1 | 78 | dona:35
Marmelad | marmelad мармелад | 320 | 0 | 0.1 | 80 | dona:10
Muzqaymoq (plombir) | morojenoe мороженое | 230 | 3.5 | 15 | 20 | stakancha:80
Muzqaymoq (eskimo) | morojenoe эскимо | 270 | 3.5 | 18 | 24 | dona:70
#x
Tovuq burger | chikenburger burger | 240 | 13 | 10 | 25 | dona:200
Kartoshka (dilim, pechda) | po derevenski картофель по-деревенски | 180 | 3 | 8 | 24 | porsiya:150
Kesadilya | kesadilya кесадилья | 260 | 12 | 13 | 25 | dona:200
Qarsildoq tovuq | kfc tovuq крылья | 260 | 20 | 15 | 10 | bo'lak:120
Burger | gamburger бургер | 250 | 12 | 11 | 26 | dona:200
Chizburger | chizburger чизбургер | 270 | 14 | 13 | 25 | dona:120
Lavash (tovuqli) | shaurma lavash шаурма | 210 | 11 | 10 | 20 | dona:350
Lavash (go'shtli) | shaurma lavash шаурма | 230 | 11 | 12 | 21 | dona:350
Donar | doner kebab донер | 230 | 12 | 11 | 22 | dona:300
Hot-dog | hotdog хот-дог | 260 | 9 | 14 | 24 | dona:150
Pitsa (pishloqli) | pizza pitsa пицца | 270 | 11 | 10 | 33 | bo'lak:110
Pitsa (kolbasali) | pizza pepperoni пицца | 290 | 12 | 13 | 30 | bo'lak:110
Kartoshka fri | fri free картошка фри | 310 | 3.4 | 15 | 41 | kichik:80, o'rta:120, katta:150
Nagetslar | nagets наггетсы | 290 | 15 | 18 | 16 | dona:17, 6 dona:100
Chips | chipsy чипсы | 540 | 6 | 34 | 53 | kichik paket:40, katta paket:100
Sendvich | sendvich бутерброд | 290 | 12 | 15 | 27 | dona:150
Rollar (sushi) | sushi rol роллы | 160 | 6 | 4 | 25 | dona:25, 8 dona:200
#y
Tomat pastasi | tomat pasta томатная паста | 80 | 4 | 0.5 | 15 | osh qoshiq:20
Soya sousi | soevyy sous соевый соус | 55 | 6 | 0 | 8 | osh qoshiq:15
O'simlik yog'i | yog maslo масло подсолнечное | 899 | 0 | 99.9 | 0 | choy qoshiq:5, osh qoshiq:15
Sariyog' | sariyog maslo сливочное масло | 720 | 0.6 | 80 | 0.6 | choy qoshiq:5, osh qoshiq:15
Mayonez | mayonez майонез | 630 | 1 | 67 | 3 | osh qoshiq:20
Ketchup | ketchup кетчуп | 100 | 1.5 | 0.2 | 24 | osh qoshiq:15
`;

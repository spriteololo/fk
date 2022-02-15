
var canGo = true;


console.log("Started")

var alreadyStarted = false;
function initMod(){
    if (top.frames["d_act"].global_data != undefined && top.frames["d_act"].global_data.my_group != undefined) {
        if(localStorage.getItem("Start_script") == "true") {
            startScript();
        }
        setTimeout(createControls, 800);
    } else {
        setTimeout(initMod, 200);
    }
}

var reloadId = 0;

setTimeout(initMod, 1000);

var isStarted = false;
var isReallyStarted = false;
var alsoFlag = false;

var forest_frame = top.frames["d_act"];

var count = 0;
var lastTimeStamp = new Date();
var currentState = "Nothing_forward"

var hitCount = 0;
var currentStoneId = 0;
var timeoutId = 0;

var possibleCopperIdList = [];
var possibleIronIdList = [];
var possibleGoldIdList = [];

var ignoredItems = [];

var timeoutIds = [];
var intervalId = 0;
var canvIntervalId = 0;

function startBtnClicked() {
    loadLocalStorage();
    log.v("startBtnClicked");
    isReallyStarted = true;
    startLoop()
    startGraph()
}

function startGraph(){
    canvIntervalId = setInterval(function() {clearDots(); startCanv()}, 2000);
}

function stopBtnClicked() {
    log.v("stopBtnClicked");
    clearInterval(intervalId);
    do {
        clearTimeout(timeoutIds.pop())
    } while (timeoutIds.length != 0)
    isReallyStarted = false;
    clearInterval(canvIntervalId);
    clearDots();
    isStarted = false;
    rewriteLocalStorage();
}

function startLoop() {
    if(top.frames["d_act"].global_data.my_group.sostav.leader.nick == "Божий одуванчик") {
        if(!isStarted){
            isStarted = true;
            intervalId = setInterval(looper, getRandom(1000, 2000));
        } else {
            log.v("Already Started")
        }
    } else {
        log.e("Wrong")
    }
}

function stopLoop() {
    if(isStarted) {
        clearInterval(intervalId);
        do {
            clearTimeout(timeoutIds.pop())
        } while (timeoutIds.length != 0)
        isStarted = false
    } else {
        log.v("Not started yet")
    }
}

function looper() {
    if(!isReallyStarted) return;
    log.v("START #" + count)
    var currTime = new Date()
    log.i(currTime - lastTimeStamp + " since last time stamp")
    lastTimeStamp = currTime;
    var timerCountDown = getSecondsLeft();
    var overlayResponse = getResponseIfExists();
    setOverlayOff();
    log.v("timerCountDown = " + timerCountDown )
    if(timerCountDown == "-1") { // Timer is off
        log.i("response = " + overlayResponse + ", currentState = " + currentState);
        if(overlayResponse == 'Вы должны иметь в руках "Золотая кирка рудокопа" или "Кирка рудокопа"') {
            stopLoop();
            var promise = new Promise(function (resolve) {
                jQuery.get('https://5kings.ru/bag_type_17.chtml', function (response) {
                    var re = new RegExp('<img width="75" height="50" src="https:\/\/5kings\.ru\/resources\/upload\/1_2404\.gif" title="Кирка рудокопа">.+\\n.+\\n.+\\n<form method=post><input type=hidden name=actUser-Wear value=(\\d+)>', 'gm');
                    var match = re.exec(response);
                    if (match && match[1]) {
                        var itemId = +match[1];

                        setTimeout(function () {
                            jQuery.post('https://5kings.ru/bag_type_17.chtml', { 'actUser-Wear': itemId }).then(function () {
                                resolve();
                            });
                        }, 6000);
                    }
                })
            })
            promise.then(function() {startLoop()})
        } else {
            if(overlayResponse == "Вы травмированы. Для работы необходимо вылечить травмы.") {
                stopLoop();
                var promise = new Promise(function (resolve) {
                    if(healId !== undefined) {
                        jQuery.post('https://5kings.ru/ability.html', { 'actUser-UseCast': healId }).then(function () {
                            resolve();
                        });
                    } else {
                        log.e("healId not defined")
                    }
                })
                promise.then(function() {startLoop()})
            } else {
                switch (currentState) {
                    case ("Copper_forward") : {
                    hitCount = 0;
                    if(getLeftForwardAndRight()[1].type == "copper" &&
                        overlayResponse != "Перед Вами нечего добывать.") {
                        clickStartDig();
                        removeFromPossibleLists(currentStoneId, "copper");
                    } else {
                        currentState = "Nothing_forward"
                        stopLoop();
                        timeoutIds.push( setTimeout(startLoop, getRandom(1200, 5000)) );
                    }
                    break;
                }
                    case ("Iron_forward"):
                    case ("Gold_forward"): {
                    hitCount = 0;
                    if(getLeftForwardAndRight()[1].type == "iron" &&
                        overlayResponse != "Перед Вами нечего добывать.") {
                        clickStartDig();
                        removeFromPossibleLists(currentStoneId, "iron");
                    } else {
                        currentState = "Nothing_forward"
                        stopLoop();
                        timeoutIds.push( setTimeout(startLoop, getRandom(1200, 5000)) );
                    }
                    break;
                }
                    case ("Nothing_forward"): {
                    log.v("response = " + overlayResponse);
                    if(overlayResponse.includes("так же")){
                        alsoFlag = true
                    }
                    if (overlayResponse.includes("медь в радиусе 5 шагов от Вас")){
                        increaseCurrentRadiusStones(true)
                        if(searchCopper) {
                            log.i("Copper in 5-cell radius")
                            addToPossibleListItems(getLeftForwardAndRight()[1].id, "copper");
                        }
                        if(overlayResponse.match(/медь в радиусе 5 шагов от Вас/g  || []).length == 2) {
                            alsoFlag = false
                            //TODO
                        }
                        if(!alsoFlag) {
                            stopLoop();
                            hitCount = 0;
                            var waitFor = goToTheNearestStone(possibleListItemsMostType(), searchCopper)
                            log.v("Waiting for = " + waitFor)
                            if(Number.isInteger(waitFor)) {
                                timeoutIds.push( setTimeout(startLoop, waitFor * 1000 + getRandom(1200, 5000)) );
                            }
                            return;
                        }
                        alsoFlag = false
                    }
                    if (overlayResponse.includes("железо в радиусе 5 шагов от Вас")) {
                        increaseCurrentRadiusStones(true)
                        if(searchIron) {
                            log.i("Iron in 5-cell radius")
                            addToPossibleListItems(getLeftForwardAndRight()[1].id, "iron");
                        }
                        if(overlayResponse.match(/железо в радиусе 5 шагов от Вас/g  || []).length == 2) {
                            alsoFlag = false
                            //TODO
                        }
                        if(!alsoFlag) {
                            stopLoop();
                            hitCount = 0;
                            var waitFor;
                            if(possibleListItemsMostType() == "gold") {
                                waitFor = goToTheNearestStone("gold", searchGold && isThere5Possible())
                            } else {
                                if(possibleListItemsMostType() == "iron") {
                                    waitFor = goToTheNearestStone("iron", searchIron)
                                } else {
                                    waitFor = goToTheNearestStone("copper", searchCopper)
                                }
                            }
                            log.v("Waiting for = " + waitFor)
                            if(Number.isInteger(waitFor)) {
                                timeoutIds.push( setTimeout(startLoop, waitFor * 1000 + getRandom(1200, 5000)) );
                            }
                            return;
                        }
                        alsoFlag = false
                    }
                    if (overlayResponse.includes("золото в радиусе 5 шагов от Вас")) {
                        increaseCurrentRadiusStones(true)
                        if(searchGold) {
                            log.i("Gold in 5-cell radius")
                            addToPossibleListItems(getLeftForwardAndRight()[1].id, "gold");
                        }
                        if(overlayResponse.match(/золото в радиусе 5 шагов от Вас/g  || []).length == 2) {
                            alsoFlag = false
                            //TODO
                        }
                        if(!alsoFlag) {
                            stopLoop();
                            hitCount = 0;
                            var waitFor = goToTheNearestStone("gold", searchGold);
                            log.v("Waiting for = " + waitFor)
                            if(Number.isInteger(waitFor)) {
                                timeoutIds.push( setTimeout(startLoop, waitFor * 1000 + getRandom(1200, 5000)) );
                            }
                            return;
                        }
                        alsoFlag = false
                    }
                    if (overlayResponse.includes("сосна в радиусе 5 шагов от Вас") ||
                        overlayResponse.includes("дуб в радиусе 5 шагов от Вас")) {
                        stopLoop();
                        timeoutIds.push( setTimeout(startLoop,getRandom(1200, 5000)) );
                    }

                    if (overlayResponse == "Перед Вами нечего добывать.") {
                        log.i("NOTHING TO DIG, GO TO ANOTHER PLACE")
                        hitCount = 0;
                        currentStoneId = 0;
                        stopLoop();
                        log.i("currentStoneId cleared");
                        var waitFor = goToTheNearestStone(possibleListItemsMostType(), isThere5Possible())
                        log.v("Waiting for = " + waitFor)
                        if(Number.isInteger(waitFor)) {
                            timeoutIds.push( setTimeout(startLoop, waitFor * 1000 + getRandom(1200, 5000)) );
                        }
                        return;
                    }
                    if (overlayResponse == "Ничего не найдено" || overlayResponse == "Not overlayed") {
                        if (overlayResponse == "Ничего не найдено"){
                            increaseCurrentRadiusStones()
                        }
                        log.v("hitCount = " + hitCount)
                        if(hitCount < numberOfSearches() &&
                            (isThere5Possible() || (searchIron || searchCopper) && getIgnoredItemById(currentStoneId, getStoneTypeById(currentStoneId)).perc < 100
                                    || searchGold && getIgnoredItemById(currentStoneId, getStoneTypeById(currentStoneId)).percGold < 100 )) {
                            log.v("SEARCH")
                            var direction = fixDirection(currentStoneId);
                            log.i("direction = " + direction)
                            switch (direction) {
                                case ("good") : {
                                clickSearch();
                                break;
                            }
                                case ("turn_left") : {
                                stopLoop();
                                CheckKeyDown({keyCode: 37})
                                timeoutIds.push( setTimeout(startLoop, getRandom(500, 1000)) );
                                break;
                            }
                                case ("turn_right") : {
                                stopLoop();
                                CheckKeyDown({keyCode: 39})
                                timeoutIds.push( setTimeout(startLoop, getRandom(500, 1000)) );
                                break;
                            }
                                case ("need_to_go") : {
                                stopLoop();
                                var waitFor = goToTheNearestStone(possibleListItemsMostType(), isThere5Possible())
                                log.v("Waiting for = " + waitFor)
                                if(Number.isInteger(waitFor)) {
                                    timeoutIds.push( setTimeout(startLoop, waitFor * 1000 + getRandom(1200, 5000)) );
                                }
                                break;
                            }
                                case ("try_to_turn") : {
                                stopLoop();
                                CheckKeyDown({keyCode: 39})
                                timeoutIds.push( setTimeout(startLoop, getRandom(500, 1000)) );
                                break;
                            }
                            }
                        } else {
                            log.i("GO TO ANOTHER PLACE")
                            getIgnoredItemById(currentStoneId, getStoneTypeById(currentStoneId))
                            hitCount = 0;
                            currentStoneId = 0;
                            stopLoop();
                            log.i("currentStoneId cleared");
                            var waitFor = goToTheNearestStone(possibleListItemsMostType(), isThere5Possible())
                            log.v("Waiting for = " + waitFor)
                            if(Number.isInteger(waitFor)) {
                                timeoutIds.push( setTimeout(startLoop, waitFor * 1000 + getRandom(1200, 5000)) );
                            }
                        }
                        return;
                    }
                    if(overlayResponse.includes("медь слева от Вас")) {
                        log.e("Copper on the left, turned and start")
                        removeFromPossibleLists(getLeftForwardAndRight()[0].id, "copper")
                        if(!alsoFlag) {
                            if(searchCopper) {
                                CheckKeyDown({keyCode: 37}) //TurnLeft
                                clickStartDig();
                                hitCount = 0
                                currentState = "Copper_forward"
                            } else {
                                CheckKeyDown({keyCode: 39}) //TurnRight
                                clickSearch();
                                saveStone(getLeftForwardAndRight()[0].id, "copper")
                                increaseConcreteById(getLeftForwardAndRight()[0].id, 20001)
                                stopLoop()
                                timeoutIds.push( setTimeout(startLoop, getRandom(1200, 5000)) );
                            }
                            return;
                        } else {
                            addToPossibleForwardStone(getLeftForwardAndRight()[0].id, "copper")
                        }
                        alsoFlag = false
                    }
                    if(overlayResponse.includes("медь справа от Вас"))  {
                        log.e("Copper on the right, turned and start")
                        removeFromPossibleLists(getLeftForwardAndRight()[2].id, "copper")
                        if(!alsoFlag) {
                            if(searchCopper) {
                                CheckKeyDown({keyCode: 39}) //TurnRight
                                clickStartDig();
                                hitCount = 0
                                currentState = "Copper_forward"
                            } else {
                                CheckKeyDown({keyCode: 37}) //TurnLeft
                                clickSearch();
                                saveStone(getLeftForwardAndRight()[2].id, "copper")
                                increaseConcreteById(getLeftForwardAndRight()[2].id, 20001)
                                stopLoop()
                                timeoutIds.push( setTimeout(startLoop, getRandom(1200, 5000)) );
                            }
                            return;
                        } else {
                            addToPossibleForwardStone(getLeftForwardAndRight()[2].id, "copper")
                        }
                        alsoFlag = false
                    }
                    if(overlayResponse.includes("медь прямо перед Вами")) {
                        log.e("Copper forward")
                        removeFromPossibleLists(getLeftForwardAndRight()[1].id, "copper")
                        if(!alsoFlag) {
                            if(searchCopper) {
                                clickStartDig();
                                hitCount = 0
                                currentState = "Copper_forward"
                            } else {
                                saveStone(getLeftForwardAndRight()[1].id, "copper")
                                increaseConcreteById(getLeftForwardAndRight()[1].id, 20001)
                                stopLoop()
                                timeoutIds.push( setTimeout(startLoop, getRandom(1200, 5000)) );
                            }
                            return;
                        } else {
                            addToPossibleForwardStone(getLeftForwardAndRight()[1].id, "copper")
                        }
                        alsoFlag = false
                    }
                    if(overlayResponse.includes("железо слева от Вас")) {
                        log.e("Iron on the left, turned and start")
                        removeFromPossibleLists(getLeftForwardAndRight()[0].id, "iron")
                        if(!alsoFlag) {
                            if(searchIron) {
                                CheckKeyDown({keyCode: 37}) //TurnLeft
                                clickStartDig();
                                hitCount = 0
                                currentState = "Iron_forward"
                            } else {
                                saveStone(getLeftForwardAndRight()[0].id, "iron")
                                increaseConcreteById(getLeftForwardAndRight()[0].id, 20001)
                                stopLoop()
                                timeoutIds.push( setTimeout(startLoop, getRandom(1200, 5000)) );
                            }
                            return;
                        } else {
                            addToPossibleForwardStone(getLeftForwardAndRight()[0].id, "iron")
                        }
                        alsoFlag = false
                    }
                    if(overlayResponse.includes("железо справа от Вас"))  {
                        log.e("Iron on the right, turned and start")
                        removeFromPossibleLists(getLeftForwardAndRight()[2].id, "iron")
                        if(!alsoFlag) {
                            if(searchIron) {
                                CheckKeyDown({keyCode: 39}) //TurnRight
                                clickStartDig();
                                hitCount = 0
                                currentState = "Iron_forward"
                            } else {
                                saveStone(getLeftForwardAndRight()[2].id, "iron")
                                increaseConcreteById(getLeftForwardAndRight()[2].id, 20001)
                                stopLoop()
                                timeoutIds.push( setTimeout(startLoop, getRandom(1200, 5000)) );
                            }
                            return;
                        } else {
                            addToPossibleForwardStone(getLeftForwardAndRight()[2].id, "iron")
                        }
                        alsoFlag = false
                    }
                    if(overlayResponse.includes("железо прямо перед Вами")) {
                        log.e("Iron forward")
                        removeFromPossibleLists(getLeftForwardAndRight()[1].id, "iron")
                        if(!alsoFlag) {
                            if(searchIron) {
                                clickStartDig();
                                hitCount = 0
                                currentState = "Iron_forward"
                            } else {
                                saveStone(getLeftForwardAndRight()[1].id, "iron")
                                increaseConcreteById(getLeftForwardAndRight()[1].id, 20001)
                                stopLoop()
                                timeoutIds.push( setTimeout(startLoop, getRandom(1200, 5000)) );
                            }
                            return;
                        } else {
                            addToPossibleForwardStone(getLeftForwardAndRight()[1].id, "iron")
                        }
                        alsoFlag = false
                    }
                    if(overlayResponse.includes("золото слева от Вас"))  {
                        log.e("Gold on the left, turned and start")
                        removeFromPossibleLists(getLeftForwardAndRight()[0].id, "gold")
                        if(!alsoFlag) {
                            CheckKeyDown({keyCode: 37}) //TurnLeft
                            clickStartDig();
                            hitCount = 0
                            currentState = "Gold_forward"
                            return;
                        } else {
                            addToPossibleForwardStone(getLeftForwardAndRight()[0].id, "gold")
                        }
                    }
                    if(overlayResponse.includes("золото справа от Вас"))  {
                        log.e("Gold on the right, turned and start")
                        removeFromPossibleLists(getLeftForwardAndRight()[2].id, "gold")
                        if(!alsoFlag) {
                            CheckKeyDown({keyCode: 39}) //TurnRight
                            clickStartDig();
                            hitCount = 0
                            currentState = "Gold_forward"
                            return;
                        } else {
                            addToPossibleForwardStone(getLeftForwardAndRight()[2].id, "gold")
                        }
                        alsoFlag = false
                    }
                    if(overlayResponse.includes("золото прямо перед Вами")) {
                        log.e("Gold forward")
                        removeFromPossibleLists(getLeftForwardAndRight()[1].id, "gold")
                        if(!alsoFlag) {
                            clickStartDig();
                            hitCount = 0
                            currentState = "Gold_forward"
                            return;
                        } else {
                            addToPossibleForwardStone(getLeftForwardAndRight()[1].id, "gold")
                        }
                        alsoFlag = false
                    }
                    if (overlayResponse.includes("сосна прямо перед Вами") ||
                        overlayResponse.includes("сосна справа от Вас") ||
                        overlayResponse.includes("сосна слева от Вас") ) {
                        stopLoop();
                        timeoutIds.push( setTimeout(startLoop,getRandom(1200, 5000)) );
                    }
                    if(alsoFlag != false) {
                        log.e("UNEXPECTED BEHAVIOR")
                        stopLoop()
                    }
                }
                }
            }
        }
    } else { // Timer is on
        stopLoop();
        if(Number.isInteger(timerCountDown)) {
            //Checks also for Вы неожиданно быстро управились
            timeoutIds.push( setTimeout(startLoop,
                (timerCountDown > 90 ? (timerCountDown - 90) : timerCountDown) * 1000 + getRandom(1200, 5000)) );
        }
    }
    log.v("FINISH #" + count)
    count++;
}

function CheckKeyDown(event){
    switch(event.keyCode){
        case 37: Client.send('actNewMaps-ChangeNapr=0');
        break;
        case 39: Client.send('actNewMaps-ChangeNapr=1');
        break;
    }
}

function numberOfSearches() {
    var probability = 0;
    switch(getLeftForwardAndRight()[1].type){
        case "gold":
        case "iron":
        probability = searchGold ? goldProb.forward : ironProb.forward;
        break;
        case "copper":
        probability = copperProb.forward;
        break;
    }
    if(probability == 0) probability = 20;
    log.v("probability = " + Math.ceil(100 / probability))
    return Math.ceil(100 / probability);
}

function whatShouldISearch() {
    if(!searchGold && !searchIron && searchCopper) return "copper";
    if(!searchGold && searchIron && !searchCopper) return "iron";
    if(searchGold && !searchIron && !searchCopper) return "gold";
    //TODO ADD for several
    return "undefined";
}

function isThere5Possible(){
    return possibleGoldIdList.length > 0 || possibleIronIdList.length > 0 || possibleCopperIdList.length > 0;
}

function increaseCurrentRadiusStones(forwardOnly) {
    var leftForwardRight = getLeftForwardAndRight();

    if(searchCopper) {
        var copperAround = getAllItemsInRadius(5, "copper");
        for(var i = 0; i < copperAround.length; i++) {
            var ignoredItem = getIgnoredItemById(copperAround[i], getStoneTypeById(copperAround[i]))
            switch(copperAround[i]) {
                case leftForwardRight[0].id:
                if(leftForwardRight[0].type == "copper") {
                    ignoredItem.perc += copperProb.side;
                }
                break;
                case leftForwardRight[2].id:
                if(leftForwardRight[2].type == "copper") {
                    ignoredItem.perc += copperProb.side;
                }
                break;
                case leftForwardRight[1].id:
                if(leftForwardRight[1].type == "copper") {
                    ignoredItem.perc += copperProb.forward;
                }
                break;
                default:
                if(forwardOnly != true) {
                    ignoredItem.perc += copperProb.radius;
                }
            }
            addOrReplaceIgnoredItem(ignoredItem)
        }
    }
    if(searchIron) {
        var ironAround = getAllItemsInRadius(5, "iron");
        for(var i = 0; i < ironAround.length; i++) {
            var ignoredItem = getIgnoredItemById(ironAround[i], getStoneTypeById(ironAround[i]))
            switch(ironAround[i]) {
                case leftForwardRight[0].id:
                if(leftForwardRight[0].type == "iron") {
                    ignoredItem.perc += ironProb.side;
                }
                break;
                case leftForwardRight[2].id:
                if(leftForwardRight[2].type == "iron") {
                    ignoredItem.perc += ironProb.side;
                }
                break;
                case leftForwardRight[1].id:
                if(leftForwardRight[1].type == "iron") {
                    ignoredItem.perc += ironProb.forward;
                }
                break;
                default:
                if(forwardOnly != true) {
                    ignoredItem.perc += ironProb.radius;
                }
            }
            addOrReplaceIgnoredItem(ignoredItem)
        }
    }

    if(searchGold) {
        var goldAround = getAllItemsInRadius(5, "gold");
        for(var i = 0; i < goldAround.length; i++) {
            var ignoredItem = getIgnoredItemById(goldAround[i], getStoneTypeById(goldAround[i]))
            switch(goldAround[i]) {
                case leftForwardRight[0].id:
                if(leftForwardRight[0].type == "iron") {
                    ignoredItem.percGold += goldProb.side;
                }
                break;
                case leftForwardRight[2].id:
                if(leftForwardRight[2].type == "iron") {
                    ignoredItem.percGold += goldProb.side;
                }
                break;
                case leftForwardRight[1].id:
                if(leftForwardRight[1].type == "iron") {
                    ignoredItem.percGold += goldProb.forward;
                }
                break;
                default:
                if(forwardOnly != true){
                    ignoredItem.percGold += goldProb.radius;
                }
            }
            addOrReplaceIgnoredItem(ignoredItem)
        }
    }
}

function increaseConcreteById(id, num) {
    var ignoredItem = getIgnoredItemById(id, getStoneTypeById(id))
    ignoredItem.perc += num
    ignoredItem.percGold += num
    addOrReplaceIgnoredItem(ignoredItem)
}

var prefix = "zoloto_instead_of_"
function saveStone(id, type) {
    var stones = JSON.parse(localStorage.getItem(prefix + type))
    var tempArr =[]
    if(stones != null){
        if(stones.hasOwnProperty("items")) {
            if(stones.items.indexOf(id) == -1) {
                stones.items.push(id)
            }
        }
    } else {
        tempArr.push(id)
        stones = {items: tempArr}
    }
    localStorage.setItem((prefix + type),
        JSON.stringify(stones))
}

function fixDirection(currentStoneId){
    var items = getAllItemsInRadius(1, "undefined");
    var lfr = getLeftForwardAndRight();
    switch (currentStoneId) {
        case lfr[0].id: if(lfr[0].type == "iron" || lfr[0].type == "copper") return "turn_left";
        break;
        case lfr[1].id: if(lfr[1].type == "iron" || lfr[1].type == "copper") return "good";
        break;
        case lfr[2].id: if(lfr[2].type == "iron" || lfr[2].type == "copper") return "turn_right";
        break;
    }
    if(getAllItemsInRadius(1, "undefined").indexOf(currentStoneId) == -1) return "need_to_go";
    return "try_to_turn";
}

function getMyPositionAndDirection() {
    return {
            x: forest_frame.global_data.my_group.posx,
            y: forest_frame.global_data.my_group.posy,
            direction: forest_frame.global_data.my_group.napr
    };
}

function isInIgnoredItemsByObj(item) {
    if(item != null && item.hasOwnProperty("id")) {
        return ignoredItems.find(item => item.id == id) !== undefined
    }
}

function getIgnoredItemById(_id, type) {
    if(type == "copper")  {
        var item = isInIgnoredItemById(_id) ? ignoredItems.find(item => item.id == _id) : {id: _id, perc: 0, percGold: 1000}
        if(!item.hasOwnProperty("percGold")) item.percGold = 1000;
        addOrReplaceIgnoredItem(item)
        return item;
    } else {
        var item = isInIgnoredItemById(_id) ? ignoredItems.find(item => item.id == _id) : {id: _id, perc: 0, percGold: 0}

        return item;
    }
}

function getSkippedStoneId(){
    var filteredArr;
    if(searchGold) {
        filteredArr = ignoredItems.filter(item => item.percGold < 100 && item.id > 18000000)
        .filter(item => getStoneTypeById(item.id) == "undefined" || getStoneTypeById(item.id) == "iron")
    } else if(searchIron || searchCopper) {
        filteredArr = ignoredItems.filter(item => item.perc < 100)
    }
    var leastId = Number.MAX_VALUE
    filteredArr.forEach(item => {if(getDistanceToId(item.id) < leastId) {
        if(getDistanceToId(item.id) == 0) {
            removeFromIgnored(item.id)
        }
        leastId = item.id
    }})
    return leastId
}

function removeFromIgnored(id) {
    ignoredItems = ignoredItems.filter(item => item.id != id)
}

function isInIgnoredItemById(id) {
    return ignoredItems.find(item => item.id == id) !== undefined
}

function addOrReplaceIgnoredItem(item) {
    if(item != null && item.hasOwnProperty("id") && item.hasOwnProperty("perc") && item.hasOwnProperty("percGold")) {
        var tempIndex = ignoredItems.findIndex(it => it.id == item.id);
        if(tempIndex != -1) {
            ignoredItems[tempIndex] = {id: item.id, perc: item.perc, percGold: item.percGold}
        } else {
            ignoredItems.push({id: item.id, perc: item.perc, percGold: item.percGold})
        }
    }
}

function getLeftForwardAndRight(){
    var myPos = getMyPositionAndDirection();
    var absY = myPos.y;
    var absX = myPos.x;
    var tempDirection = parseInt(myPos.direction);

    var f = function(napr) {
        switch(napr) {
            case 1:
            tempY--;
            break;
            case 2:
            tempY--;
            tempX++;
            break;
            case 3:
            tempX++;
            break;
            case 4:
            tempY++;
            tempX++;
            break;
            case 5:
            tempY++;
            break;
            case 6:
            tempY++;
            tempX--;
            break;
            case 7:
            tempX--;
            break;
            case 8:
            tempY--;
            tempX--;
            break;
        }
    }
    var tempY = absY; var tempX = absX;
    f(tempDirection);
    var forwardId = (tempY - 1) * 4000 + tempX;

    tempY = absY; tempX = absX;
    f(tempDirection - 1 == 0 ? 8 : tempDirection - 1);
    var leftId = (tempY - 1) * 4000 + tempX;

    tempY = absY; tempX = absX;
    f(tempDirection + 1 == 9 ? 1 : tempDirection + 1);
    var rightId = (tempY - 1) * 4000 + tempX;

    return [ {id: leftId, type: getStoneTypeById(leftId)},
        {id: forwardId, type: getStoneTypeById(forwardId)},
        {id: rightId, type: getStoneTypeById(rightId)} ];
}

function getAllItemsInRadius(radius, stoneType) {
    var allItemsOnTheScreen = forest_frame.global_data.abs_poses
    var allItemsOnTheScreenIndexes = forest_frame.global_data.abs_poses_index

    var itemsInRadius = [];

    var currentPosition = {};
    currentPosition.x = forest_frame.global_data.my_group.posx
    currentPosition.y = forest_frame.global_data.my_group.posy

    for(var index = 0; index < allItemsOnTheScreenIndexes.length; index++) {
        var item = allItemsOnTheScreen[allItemsOnTheScreenIndexes[index]];
        if(item != null && item.hasOwnProperty("type") &&
            item.hasOwnProperty("id") && item.id != 0 &&
            item.hasOwnProperty("posx") && Math.abs(currentPosition.x - item.posx) <= radius  &&
            item.hasOwnProperty("posy") && Math.abs(currentPosition.y - item.posy) <= radius) {

            switch(stoneType) {
                case "copper":
                if(item.type >= 74 && item.type <= 75 || item.type >= 104 && item.type <= 106) {
                    itemsInRadius.push(parseInt(item.id));
                }
                break;
                case "iron":
                case "gold":
                if(item.type >= 70 && item.type <= 73 || item.type >= 107 && item.type <= 113) {
                    itemsInRadius.push(parseInt(item.id));
                }
                break;
                case "undefined":
                if(item.type >= 70 && item.type <= 75 || item.type >= 104 && item.type <= 113) {
                    itemsInRadius.push(parseInt(item.id));
                }
                break;
            }
        }
    }

    return itemsInRadius;
}

function getStoneTypeById(id) {
    var typeNum = 0;
    var len = forest_frame.global_data.abs_poses_index.length;
            for (var i = 0; i < len; i++) {
                var item = forest_frame.global_data.abs_poses[forest_frame.global_data.abs_poses_index[i]];
                 	if(item !== undefined && item.id == id) {
            		typeNum = parseInt(item.type)
        		}
            }
    if(typeNum >= 74 && typeNum <= 75 || typeNum >= 104 && typeNum <= 106) {
        return "copper";
    }
    if(typeNum >= 70 && typeNum <= 73 || typeNum >= 107 && typeNum <= 113) {
        return "iron";
    }
    return "undefined";
}

function clickSearch() {
    hitCount++;
    top.frames["d_act"].Client.send('actNewMaps-StartSearch=1')
}

function isInPossibleListItems(id, stoneType) {
    if(id != 0) {
        switch(stoneType) {
            case "copper":
            return possibleCopperIdList.forEach(item => {if(item.indexOf(id) != -1) return true})
            return false;
            break;
            case "iron":
            return possibleIronIdList.forEach(item => {if(item.indexOf(id) != -1) return true})
            return false;
            break;
            case "gold":
            return possibleGoldIdList.forEach(item => {if(item.indexOf(id) != -1) return true})
            return false;
            break;
            case "undefined":
            return isInPossibleListItems(id, "copper") ||
                    isInPossibleListItems(id, "iron") ||
                    isInPossibleListItems(id, "gold")
            break;
        }
    }
}

function removeFromPossibleLists(obj, stoneType) {
    var id = 0;
    if(obj != null && obj.hasOwnProperty("id")) {
        id = obj.id;
    } else {
        id = obj;
    }
    if(id != 0) {
        switch(stoneType) {
            case "copper":
            possibleCopperIdList.forEach(item => {if(item.indexOf(id) != -1) item.length = 0})
            possibleCopperIdList = possibleCopperIdList.filter(item => item.length > 0)
            break;
            case "iron":
            possibleIronIdList.forEach(item => {if(item.indexOf(id) != -1) item.length = 0})
            possibleIronIdList = possibleIronIdList.filter(item => item.length > 0)
            possibleGoldIdList = possibleGoldIdList.map(item => item.filter(_id => _id != id))
            break;
            case "gold":
            possibleGoldIdList.forEach(item => {if(item.indexOf(id) != -1) item.length = 0})
            possibleGoldIdList = possibleGoldIdList.filter(item => item.length > 0)
            possibleIronIdList = possibleIronIdList.map(item => item.filter(_id => _id != id))
            break;
            case "undefined":
            removeFromPossibleLists(id, "copper");
            removeFromPossibleLists(id, "iron");
            removeFromPossibleLists(id, "gold");
            break;
        }
    }
}

function possibleListItemsMostType() {
    if(possibleGoldIdList.length > 0) return "gold";
    if(possibleIronIdList.length > 0) return "iron";
    if(possibleCopperIdList.length > 0) return "copper";
    return whatShouldISearch();
}

function addToPossibleForwardStone(id, stoneType){
    var stoneIds = []
    stoneIds.push(parseInt(id))
    if(id != 0) {
        switch(stoneType) {
            case "copper":
            var copy = true;
            for(var ind = 0; ind < possibleCopperIdList.length; ind++) {
            if(possibleCopperIdList[ind].join(",").localeCompare(stoneIds.join(",")) == 0) {
                copy = false
            }
        }
            if(copy) {
                possibleCopperIdList.push(stoneIds)
            }
            break;
            case "iron":
            var copy = true;
            for(var ind = 0; ind < possibleIronIdList.length; ind++) {
            if(possibleIronIdList[ind].join(",").localeCompare(stoneIds.join(",")) == 0) {
                copy = false
            }
        }
            if(copy) {
                possibleIronIdList.push(stoneIds)
            }
            break;
            case "gold":
            var copy = true;
            for(var ind = 0; ind < possibleGoldIdList.length; ind++) {
            if(possibleGoldIdList[ind].join(",").localeCompare(stoneIds.join(",")) == 0) {
                copy = false
            }
        }
            if(copy) {
                possibleGoldIdList.push(stoneIds)
            }
            break;
        }
    }
}

function addToPossibleListItems(id, stoneType) {
    var stoneIds = getAllItemsInRadius(5, stoneType).filter(item => item != parseInt(id));
    if(id != 0) {
        switch(stoneType) {
            case "copper":
            var copy = true;
            for(var ind = 0; ind < possibleCopperIdList.length; ind++) {
            if(possibleCopperIdList[ind].join(",").localeCompare(stoneIds.join(",")) == 0) {
                copy = false
            }
        }
            if(copy) {
                possibleCopperIdList.push(stoneIds)
            }
            break;
            case "iron":
            var copy = true;
            for(var ind = 0; ind < possibleIronIdList.length; ind++) {
            if(possibleIronIdList[ind].join(",").localeCompare(stoneIds.join(",")) == 0) {
                copy = false
            }
        }
            if(copy) {
                possibleIronIdList.push(stoneIds)
            }
            break;
            case "gold":
            var copy = true;
            for(var ind = 0; ind < possibleGoldIdList.length; ind++) {
            if(possibleGoldIdList[ind].join(",").localeCompare(stoneIds.join(",")) == 0) {
                copy = false
            }
        }
            if(copy) {
                possibleGoldIdList.push(stoneIds)
            }
            break;
        }
    }
}

function getAllPossibleItemsByType(stoneType) {
    switch(stoneType) {
        case "copper":
        return possibleCopperIdList;
        case "iron":
        return possibleIronIdList;
        case "gold":
        return possibleGoldIdList;
    }
}

function goToTheNearestStone(stoneType, goTo5Possible) {
    if(goTo5Possible) {
        var itemsArr = getAllPossibleItemsByType(stoneType);

        var smallestArr = []
        smallestArr.length = 15
        itemsArr.forEach(item => {if(item.length < smallestArr.length) smallestArr = item})
        selectCurrent5(smallestArr)

        var leastProb = Number.MAX_VALUE;
        var leastProbId = 0;
        smallestArr.forEach(id => {
            var tempIgnoredItem = getIgnoredItemById(id);
            if(stoneType == "gold") {
                if(tempIgnoredItem.percGold < leastProb) {leastProb = tempIgnoredItem.percGold; leastProbId = tempIgnoredItem.id}
            } else {
                if(tempIgnoredItem.perc < leastProb) {leastProb = tempIgnoredItem.perc; leastProbId = tempIgnoredItem.id}
            }
        })
        if(leastProbId != 0) {
            goToPosition(leastProbId);
            currentStoneId = parseInt(leastProbId)
            return getDistanceToId(currentStoneId)
        }
    } else {
        currentPosition = {
                x: forest_frame.global_data.my_group.posx,
                y: forest_frame.global_data.my_group.posy}

        var allItemsOnTheScreen = forest_frame.global_data.abs_poses
        var allItemsOnTheScreenIndexes = forest_frame.global_data.abs_poses_index
        var stoneItems = [];

        var typedStoneIds = getAllItemsInRadius(13, stoneType)

        for(var index = 0; index < allItemsOnTheScreenIndexes.length; index++) {
            var item = allItemsOnTheScreen[allItemsOnTheScreenIndexes[index]];
            if(item !== undefined && item.hasOwnProperty("id")) {
                for(var idsInd = 0; idsInd < typedStoneIds.length; idsInd++) {
                    if(typedStoneIds[idsInd] == item.id) {
                        stoneItems.push(item)
                    }
                }
            }
        }
        var stoneItemsRadius = [[],[],[],[],[],[],[],[],[],[],[],[],[]]
        for(var radius = 1; radius <= 13; radius++) {
            for(var index = 0; index < stoneItems.length; index++) {
            var dx = Math.abs(stoneItems[index].posx - currentPosition.x);
            var dy = Math.abs(stoneItems[index].posy - currentPosition.y);
            if((dx == radius && dy <= radius) || (dx <= radius && dy == radius))  {
                stoneItemsRadius[radius-1].push(stoneItems[index])
            }
        }
        }

        for(var index = 0; index < stoneItemsRadius.length; index++) {
            if(stoneItemsRadius[index].length > 0) {
                var leastProb = Number.MAX_VALUE;
                var leastProbId = 0;
                stoneItemsRadius[index].forEach(item => {
                    var tempIgnoredItem = getIgnoredItemById(item.id, getStoneTypeById(item.id));
                    if(stoneType == "gold") {
                        if(tempIgnoredItem.percGold < leastProb) {leastProb = tempIgnoredItem.percGold; leastProbId = tempIgnoredItem.id}
                    } else {
                        if(tempIgnoredItem.perc < leastProb) {leastProb = tempIgnoredItem.perc; leastProbId = tempIgnoredItem.id}
                    }

                })
                if(leastProb < 100) {
                    currentStoneId = parseInt(leastProbId);
                    goToPosition(currentStoneId)
                    return getDistanceToId(currentStoneId);
                }
            }
        }
    }
    var skippedStone = getSkippedStoneId()
    if(skippedStone != Number.MAX_VALUE) {
        currentStoneId = parseInt(skippedStone);
        log.e("going to " + currentStoneId)
        getCoordinatesAndStart(currentStoneId)
        return getDistanceToId(currentStoneId);
    } else {
        log.e("ALL STONES WHERE FOUND AND SCANNED")
    }
}

function getDistanceToId(id) {
    var num = Number(id)
    if(!isNaN(num)) {
        var result = {}
        result.x = num % 4000
        result.y = Math.floor(num / 4000) + 1
        var myPos = getMyPositionAndDirection()
        return Math.max(Math.abs(result.x - myPos.x), Math.abs(result.y - myPos.y));
    } else {
        return "isNan"
    }
}

function goToPosition(id) {
    var tempId = parseInt(id);
    if(Number.isInteger(tempId) && tempId != 0) {
        log.i("trying to go to " + tempId)
        top.frames["d_act"].Client.send('actNewMaps-GotoKletka=' + tempId)
        return tempId;
    } else {
        log.e("cannot go to" + tempId)
    }
}

function createNewButton(targetframe, id, style, onclick, inner, parstyle){
    var navbutton = createMyElement(pers_f, "b", "parent-"+id, "button", parstyle, "", "");
    var innernavbutton = createMyElement(pers_f, "b", "", "", "width: 100%;", "", "");
    navbutton.appendChild(innernavbutton);
    var end_button = createMyElement(targetframe, "button", id, "", style+"outline: none;", onclick, inner);
    innernavbutton.appendChild(end_button);
    return navbutton;
}

function createMyElement(targetframe, elname, elid, elclass, elstyle, elonclick, innertext) {
    var NewElem = targetframe.createElement(elname);
    NewElem.setAttribute("id", elid);
    NewElem.setAttribute("style", elstyle);
    NewElem.setAttribute("class", elclass);
    NewElem.setAttribute("onclick", elonclick);
    NewElem.innerHTML = innertext;
    return NewElem;
}

function createControls(){
    if (top.frames["d_pers"].document.getElementById("main_bg_pers")!=null) {
        pers_f = top.frames["d_pers"].document;
        var bod = pers_f.getElementById("main_bg_pers");
        var controlsdiv = createMyElement(pers_f, "div", "controlsdiv", "", "top: -300px;position:relative;padding:0px 5px 0px 5px;", "", "<p style='text-align:center; font-weight:bold; margin: 5px 0px 0px 0px;'>Сontrol</p>");
        var startScript = createNewButton(pers_f, "framecontrolstart", "width:100%!important;", "top.frames[\"d_act\"].startScript()", "Start", "width:49%;");
        controlsdiv.appendChild(startScript);
        var stopScript = createNewButton(pers_f, "framecontrolstop", "width:100%!important;", "top.frames[\"d_act\"].stopScript()", "Stop", "width:49%;");
        controlsdiv.appendChild(stopScript);
        var lastState = createNewButton(pers_f, "framecontrolstart", "width:100%!important;", "top.frames[\"d_act\"].lastState()", "Идти к последнему камню", "width:49%;");
        controlsdiv.appendChild(lastState);
        var clear5 = createNewButton(pers_f, "framecontrolstart", "width:100%!important;", "top.frames[\"d_act\"].clear5()", "Очистить возможные камни р5 из записей", "width:49%;");
        controlsdiv.appendChild(clear5);
        bod.appendChild(controlsdiv);
        createNavSelector();
        startShowCoordinates();
    } else {
        setTimeout(createControls, 800);
    }
}

top.frames["d_act"].startScript = function startScript(){
    if(!alreadyStarted) {
        alreadyStarted = true;
        setTimeout(startBtnClicked, 1000);
        reloadId = setTimeout(function(){
            localStorage.setItem("Start_script", "true");
            stopBtnClicked()
            top.location.reload()
        }, getRandom(30, 70)*60*1000)
    }
}

top.frames["d_act"].stopScript = function stopScript(){
    localStorage.setItem("Start_script", "false");
    setTimeout(stopBtnClicked, 1000);
    clearTimeout(reloadId);
    alreadyStarted = false;
}

top.frames["d_act"].clear5 = function clear5(){
    possibleCopperIdList = []
    possibleIronIdList = []
    possibleGoldIdList = []
    localStorage.setItem("possibleLists",
        JSON.stringify({"possibleCopperIdList": possibleCopperIdList,
            "possibleIronIdList": possibleIronIdList,
            "possibleGoldIdList": possibleGoldIdList}))
}


top.frames["d_act"].lastState = function lastState(){
    var lastState = JSON.parse(localStorage.getItem("last_state"))
    if(lastState != null) {
        if(lastState.hasOwnProperty("currentStoneId")) {
            currentStoneId = parseInt(lastState.currentStoneId);
            if(currentStoneId != 0) {
                var coordinates = getCoordinates(currentStoneId)
                start(coordinates.x, coordinates.y);
            }
        }
    }
}

//------------------------------------------------------------------NAV CONTROL
function byIdFr(dframe, did) {
    return top.frames[dframe].document.getElementById(did);
}

function createNavSelector(){
    if (top.frames["d_pers"].document.getElementById("main_bg_pers")!=null) {
        pers_f = top.frames["d_pers"].document;
        var bod = pers_f.getElementById("main_bg_pers");
        var selectdiv = createMyElement(pers_f, "div", "navdiv", "", "top: -300px;position:relative;padding:0px 5px 0px 5px;", "", "");
        var titlediv = createMyElement(pers_f, "div", "navtitle", "", "", "", "<b>Навигация:</b> ");
        selectdiv.appendChild(titlediv);
        var perscords = createMyElement(pers_f, "span", "perscords", "", "", "", "");
        titlediv.appendChild(perscords);
        var standartobjects = createMyElement(pers_f, "div", "standartobjects", "", "", "", "Объекты ");
        selectdiv.appendChild(standartobjects);
        var navkords = createMyElement(pers_f, "div", "navkords", "", "", "", "");
        var nbutt = createNewButton(pers_f, "navcontrol", "width:100%!important;", "top.frames[\"d_act\"].startNavigation()", "Запустить навигатор", "width:100%;"); //TODO
        var nbutt2 = createNewButton(pers_f, "nav2control", "width:100%!important;", "top.frames[\"d_act\"].stopNavigation()", "Остановить навигатор", "width:100%;"); //TODO
        navkords.innerHTML = "<label id='navxcord' style='line-height: 25px;float: left;display: block;max-width: 50%;' for='xnavcord'>X - <input type='text' name='xnavcord' id='xnavcord' value='' style='width: 75%;' placeholder='координата'/></label><label id='navycord' style='line-height: 25px;float: left;display: block;max-width: 50%;' for='ynavcord'>Y - <input type='text' name='ynavcord' id='ynavcord' value='' style='width: 75%;' placeholder='координата'/></label><br />";
        navkords.appendChild(nbutt);
        navkords.appendChild(nbutt2);

        selectdiv.appendChild(navkords);
        var selecttag = createMyElement(pers_f, "select", "NavSelect", "", "width:72%;", "", "");
        selecttag.setAttribute("name", "NavSelect");
        selecttag.setAttribute("onchange", "top.frames['d_act'].changeNavTarget(this.value)"); //TODO
        for (var i = 0; i<NavObjects.length; i++)  {
            var navoption = pers_f.createElement("option");
            navoption.setAttribute("value", i);
            navoption.innerHTML = NavObjects[i].name;
            selecttag.appendChild(navoption);
        }
        standartobjects.appendChild(selecttag);
        bod.appendChild(selectdiv);
    }
}

top.frames["d_act"].startNavigation = function startNavigation(){
    var xval = parseInt(byIdFr("d_pers", "xnavcord").value);
    var yval = parseInt(byIdFr("d_pers", "ynavcord").value);

    if(xval !== undefined && yval !== undefined && Number.isInteger(xval) && Number.isInteger(yval) && xval != 0 && yval != 0) {
        start(xval, yval);
    }
}

top.frames["d_act"].stopNavigation = function stopNavigation(){
    clearTimeout(timeoutId);
}

var NavObjects = [
    {name :"Не выбрано", latname : "", cordx : "", cordy : "", ofsetx: 0, ofsety: 0, obglocation : ""},
];

top.frames["d_act"].changeNavTarget = function changeNavTarget(val) {
    byIdFr("d_pers", "xnavcord").value = NavObjects[val].cordx;
    byIdFr("d_pers", "ynavcord").value = NavObjects[val].cordy;
}

function startShowCoordinates(){

    setInterval(function() {
        byIdFr("d_pers", "perscords").innerHTML = "x-"+top.frames["d_act"].global_data.my_group.posx+" y-"+top.frames["d_act"].global_data.my_group.posy;
    }, 1000)
}
//------------------------------------------------------------------NAV CONTROL END

//------------------------------------------------------------------NAVIGATION
function goTo(item) {
    log.i("trying to go to " + item)
    if(item != null && item.hasOwnProperty("id") && item.id != 0) {
        if(getApprovanceById(item.id)) {
            log.i(item.id)
            Client.send('actNewMaps-GotoKletka=' + item.id)
            return getAbs(getMyCurrentCellId(), item.id)
        }
        return 0;
    }
}

function getMyCurrentCellId() {
    var x = global_data.my_group.posx
    var y = global_data.my_group.posy
    if(!isNaN(x) && !isNaN(y)) {
        return (y-1)*4000 + x;
    }
}

function getApprovanceById(id) {
    var x = global_data.my_group.posx
    var y = global_data.my_group.posy
    if(!isNaN(x) && !isNaN(y)) {
        if(!isNaN(id)) {
            var result = getCoordinates(id);
            if(Math.abs(result.x - x) < 13 && Math.abs(result.y - y) < 13) {
                return true;
            }
        }
    }
    return false;
}

function getCoordinates (e) {
    var result = {}
    var num = Number(e)
    if(!isNaN(num)) {
        result.x = num % 4000
        result.y = Math.floor(num / 4000) + 1
        return result;
    } else {
        result = "isNan"
    }
};

function getId (x, y) {
    if(isNaN(x) || isNaN(y)) return "0"

    return (y-1) * 4000 + x;
};

function getAbs(id1, id2) {
    if(isNaN(id1) || isNaN(id2)) return "0";
    var res1 = {}
    res1.x = Math.abs((id1 % 4000) - (id2 % 4000))
    res1.y = Math.abs((Math.floor(id1 / 4000) + 1) - (Math.floor(id2 / 4000) + 1))

    if(res1.x > res1.y) return Math.round(res1.x * 2 / 3)
    else { return Math.round(res1.y * 2 / 3) }
}

function chooseDirection(x, y) {
    result = {}
    result.x = -1;
    result.y = -1;
    var x_my = global_data.my_group.posx
    var y_my = global_data.my_group.posy

    var dx = x_my - x
    var dy = y_my - y

    if(Math.abs(dx) < 13 && Math.abs(dy) < 13) {
        result.x = x;
        result.y = y;
        result.visible = true;
        return result;
    }

    if(dx < 0) {
        if(dy < 0) { //Done
            if(Math.abs(dx)) {
                result.x = 12 + x_my;
                result.y = 12 + y_my;
            } else {
                if(Math.abs(dx) > Math.abs(dy)) {
                    result.x = 12 + x_my
                    result.y = (((y - y_my) * 12) / (x - x_my)) + y_my
                }
                if(Math.abs(dy) > Math.abs(dx)) {
                    result.y = 12 + y_my
                    result.x = (((x - x_my) * 12) / (y - y_my)) + x_my
                }
            }
        }
        if(dy > 0) {
            if(Math.abs(dx) == Math.abs(dy)) {
                result.x = 12 + x_my;
                result.y = -12 + y_my
            } else {
                if(Math.abs(dx) > Math.abs(dy)) {
                    result.x = 12 + x_my
                    result.y = (((y - y_my) * 12) / (x - x_my)) + y_my
                }
                if(Math.abs(dy) > Math.abs(dx)) {
                    result.y = -12 + y_my
                    result.x = -((x - x_my) * 12) / (y - y_my) + x_my
                }
            }
        }
        if(dy == 0) {
            result.y = y_my;
            result.x = 12 + x_my;
        }
    }
    if(dx > 0) {
        if(dy < 0) {//Done
            if(Math.abs(dx) == Math.abs(dy)) {
                result.x = -12 + x_my;
                result.y = 12 + y_my;
            } else {
                if(Math.abs(dx) > Math.abs(dy)) {
                    result.x = -12 + x_my
                    result.y = -(((y - y_my) * 12) / (x - x_my)) + y_my
                }
                if(Math.abs(dy) > Math.abs(dx)) {
                    result.y = 12 + y_my
                    result.x = (((x - x_my) * 12) / (y - y_my)) + x_my
                }
            }
        }
        if(dy > 0) {//Done
            if(Math.abs(dx) == Math.abs(dy)) {
                result.x = -12 + x_my;
                result.y = -12 + y_my
            } else {
                if(Math.abs(dx) > Math.abs(dy)) {
                    result.x = -12 + x_my
                    result.y = -(((y - y_my) * 12) / (x - x_my)) + y_my
                }
                if(Math.abs(dy) > Math.abs(dx)) {
                    result.y = -12 + y_my
                    result.x = -((x - x_my) * 12) / (y - y_my) + x_my
                }
            }
        }
        if(dy == 0) {
            result.y = y_my;
            result.x = -12 + x_my;
        }
    }
    if(dx == 0) {
        result.x = x_my;
        if(dy < 0) {
            result.y = 12 + y_my
        }
        if(dy > 0) {
            result.y = -12 + y_my
        }
        if(dy == 0) {
            result.y = y_my;
        }
    }

    result.x = Math.round(result.x)
    result.y = Math.round(result.y)
    return result
}

var interval = 1000;
var timeoutId;

function goToGlobalCoordinates(x, y) {
    if(isNaN(x) || isNaN(y)) return;

    var result = chooseDirection(x, y)
    var id = 0
    if(result != null && result.hasOwnProperty("x") && result.x != -1 &&
        result.hasOwnProperty("y") && result.y != -1) {
        if(result.hasOwnProperty("visible") && result.visible == true) {
            id = 0;
            interval = goTo({"id":getId(result.x, result.y)}) * 1000;
            setTimeout(function() {canGo = true;}, interval)
        } else {
            id = getId(result.x, result.y)
        }

    }

    if(id != 0) {
        interval = goTo({"id":id}) * 1000;
        log.i("interval = " + interval )
        timeoutId = setTimeout(function() {
            canGo = true;
            start(x, y);
        }, interval)
    }
}

function start(x, y) {
    goToGlobalCoordinates(x, y)
}

function getCoordinatesAndStart(e) {
    var result = {}
    var num = Number(e)
    if(!isNaN(num)) {
        if(canGo) {
            canGo = false
            result.x = num % 4000
            result.y = Math.floor(num / 4000) + 1
            start(result.x, result.y)
            return result;
        }
    } else {
        result = "isNan"
    }
}

function stop() {
    clearTimeout(timeoutId);
}

//------------------------------------------------------------------NAVIGATION END

//-------------------Helper functions
function log2(prefix, str) {
    var d = new Date();
    console.log(prefix + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + "  -->" + str)
}

function clickStartDig() {
    top.frames["d_act"].Client.send('actNewMaps-StartDobycha=1')
}

var log = {
    e:function (str) {log2("_________  ", str)},
    i:function (str) {log2("______  ", str)},
    v:function (str) {log2("___  ", str)}
}

//Returns random number in range of @min and @max
function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

// Возвращает случайное целое число между min (включительно) и max (не включая max)
// Использование метода Math.round() даст вам неравномерное распределение!
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

//Returns timer value
function getSecondsLeft() {
    var secondsLeft = parseInt(forest_frame.global_data.wait_time) -
            (parseInt(forest_frame.global_data.timestamp) + parseInt(Math.floor(new Date().getTime() / 1000)) - parseInt(forest_frame.Realtime))

    if(secondsLeft >= 0) {
        return secondsLeft
    } else {
        return "-1";
    }
}

//Returns text of overlayed window otherwise "Not overlayed"
function getResponseIfExists() {
    if(isOverlayOn()) {
        return jQuery('#modal_form').text().slice()
    } else {
        return "Not overlayed"
    }
}

//Returns true or false
function isOverlayOn() {
    return jQuery('#overlay').css("display") == "block"
}

//Clicks the overlay to hide
function setOverlayOff() {
    if(isOverlayOn()) {
        jQuery('#overlay').click()
    }
}

var forest_f = top.frames["d_act"].document;

var dotsArr = [];

function createDot(id, text) {
    var startCellId = forest_frame.global_data.my_group.id - 48012;
    var dx = (id - startCellId) % 4000;
    var dy = Math.abs(Math.floor((id - startCellId) / 4000));

    var found = byIdFr("d_act", "dot-" + id)
    if(found == undefined){
        found = createInputElement(forest_f, "input", "dot-" + id, "display:block;position: absolute; z-index:2; width:35px; height:35px; top:0%;left:0%;margin-top:" + (dy * 35) + "px; margin-left:" + (dx * 35) + "px;background-color: #ffffff45;" + (currentStoneId == id ? "color: yellow;" : (current5.includes(id) ? "color: green;" : "color: red;")), "", text);
        byIdFr("d_act", "canvas").parentNode.appendChild(found);
        found.addEventListener("keyup", function(event) {
            if (event.keyCode === 13) {
                event.preventDefault();
                addOrReplaceIgnoredItem({id: id, perc: found.value, percGold: found.value})
            }
        });
    } else {
        found.setAttribute("value", text);
        found.setAttribute("style", "display:block;position: absolute; z-index:2; width:35px; height:35px; top:0%;left:0%;margin-top:" + (dy * 35) + "px; margin-left:" + (dx * 35) + "px;background-color: #ffffff45;" + (currentStoneId == id ? "color: yellow;" : (current5.includes(id) ? "color: green;" : "color: red;")))
    }
    dotsArr.push(found)
}

function clearDots() {
    dotsArr.forEach(function(item, i, arr) {
        item.remove();
    })
    dotsArr = [];
}

function byIdFr(dframe, did) {
    return top.frames[dframe].document.getElementById(did);
}

function createInputElement(targetframe, elname, elid, elstyle, elonclick, innertext) {
    var NewElem = targetframe.createElement(elname);
    NewElem.setAttribute("id", elid);
    NewElem.setAttribute("style", elstyle);
    NewElem.setAttribute("class", "");
    NewElem.setAttribute("onclick", elonclick);
    NewElem.setAttribute("value", innertext);
    return NewElem;
}

function createMyElement(targetframe, elname, elid, elclass, elstyle, elonclick, innertext) {
    var NewElem = targetframe.createElement(elname);
    NewElem.setAttribute("id", elid);
    NewElem.setAttribute("style", elstyle);
    NewElem.setAttribute("class", elclass);
    NewElem.setAttribute("onclick", elonclick);
    NewElem.innerHTML = innertext;
    return NewElem;
}

var current5 = []

function selectCurrent5(arrToShow) {
    current5 = arrToShow
}

function startCanv() {
    var copperArr = [];
    var ironArr = [];
    if(searchCopper) copperArr = getAllItemsInRadius(12, "copper");
    if(searchIron || searchGold) ironArr = getAllItemsInRadius(12, "iron");

    byIdFr("d_act", "canvas").parentNode.style.overflow = "hidden";

    dotsArr.forEach(function(item, i, arr) {
        if(copperArr.find(function(it){return ("dot-" + it) == item.id}) == undefined && ironArr.find(function(it){return ("dot-" + it) == item.id}) == undefined){
            item.remove();
        }
    })

    dotsArr = [];
    copperArr.forEach(id => createDot(id, getIgnoredItemById(id).perc + ""))
    ironArr.forEach(id => {
        if(searchGold) {
            createDot(id, getIgnoredItemById(id).perc + "<br />" + getIgnoredItemById(id).percGold)
        } else {
            createDot(id, getIgnoredItemById(id).perc + "")
        }
    })

}

function rewriteLocalStorage() {
    localStorage.setItem("last_state",
        JSON.stringify({"currentState": currentState,
            "hitCount": hitCount,
            "currentStoneId": currentStoneId}))
    localStorage.setItem("possibleLists",
        JSON.stringify({"possibleCopperIdList": possibleCopperIdList,
            "possibleIronIdList": possibleIronIdList,
            "possibleGoldIdList": possibleGoldIdList}))
    localStorage.setItem("ignoredItems",
        JSON.stringify({"ignoredItems": ignoredItems}))
}

function loadLocalStorage() {
    var lastState = JSON.parse(localStorage.getItem("last_state"))
    if(lastState != null) {
        if(lastState.hasOwnProperty("currentState")) currentState = lastState.currentState;
        if(lastState.hasOwnProperty("hitCount")) hitCount = lastState.hitCount;
        if(lastState.hasOwnProperty("currentStoneId")) currentStoneId = parseInt(lastState.currentStoneId);
    }
    var possibleLists = JSON.parse(localStorage.getItem("possibleLists"))
    if(possibleLists != null) {
        if(possibleLists.hasOwnProperty("possibleCopperIdList")) possibleCopperIdList = possibleLists.possibleCopperIdList;
        if(possibleLists.hasOwnProperty("possibleIronIdList")) possibleIronIdList = possibleLists.possibleIronIdList;
        if(possibleLists.hasOwnProperty("possibleGoldIdList")) possibleGoldIdList = possibleLists.possibleGoldIdList;
    }
    var _ignoredItems = JSON.parse(localStorage.getItem("ignoredItems"))
    if(_ignoredItems != null) {
        if(_ignoredItems.hasOwnProperty("ignoredItems")) ignoredItems = _ignoredItems.ignoredItems;
    }
}

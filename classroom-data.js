(function () {
  "use strict";

  const activities = [
    {
      file: "運動函數圖.html",
      title: "運動函數圖",
      category: "力學",
      format: "圖表",
      summary: "把位置、速度與加速度圖連成同一段運動故事。",
      goal: ["從斜率判讀速度與加速度", "用圖形描述靜止、等速與變速運動"],
      task: "先畫出你預期的速度圖，再改變運動條件，比較轉折點是否一致。",
      question: "位置圖的最高點，速度一定最大嗎？你看到的證據是什麼？",
      demo: ["先只顯示位置圖，請全班預測速度正負", "逐一開啟速度、加速度圖", "在轉折點暫停並比較三張圖"],
      gesture: "拖曳或調整參數時，刻意停在圖形轉折處觀察。"
    },
    {
      file: "卡文迪西實驗裝置.html",
      title: "卡文迪西扭秤實驗",
      category: "力學",
      format: "3D",
      summary: "用微小扭轉量理解萬有引力常數如何被量出來。",
      goal: ["辨認扭秤中力矩平衡的關係", "連結球體距離、質量與萬有引力"],
      task: "先預測把大球移近後扭線的偏轉方向，再從穩定位置反推作用力。",
      question: "為什麼實驗要等待系統穩定，而不能只看剛開始的最大偏轉？",
      demo: ["先隱藏數值，只觀察裝置受力", "改變大球位置並追蹤振盪", "用平衡位置說明力矩平衡"],
      gesture: "旋轉視角確認力臂、力的方向與扭線位置。"
    },
    {
      file: "SHM.html",
      title: "簡諧運動實驗室",
      category: "力學",
      format: "多視圖",
      summary: "同步觀察位移、速度、加速度與等速圓周運動投影。",
      goal: ["比較 x、v、a 的相位差", "理解簡諧運動與圓周運動投影的連結"],
      task: "先選一個角度，預測 x、v、a 的正負，再暫停檢查向量。",
      question: "物體通過平衡點時，哪一個物理量最大？為什麼？",
      demo: ["從圓周投影建立位置", "逐一加入速度與加速度向量", "在 0°、90°、180° 暫停比較"],
      gesture: "切換頁籤並使用暫停按鈕做定格比較。"
    },
    {
      file: "等速圓周運動-錐動擺.html",
      title: "等速圓周運動・錐動擺",
      category: "力學",
      format: "3D",
      summary: "從張力分解看見向心力與轉速、半徑的關係。",
      goal: ["正確分解繩張力", "由垂直平衡與水平向心力建立方程"],
      task: "預測轉速增加時擺角與半徑如何改變，再用力圖驗證。",
      question: "向心力是另一個新力，還是既有力的合力？",
      demo: ["先建立受力圖", "固定質量只改變轉速", "比較張力的水平與垂直分量"],
      gesture: "拖曳視角後回到側視圖，確認力的分量。"
    },
    {
      file: "圓周.html",
      title: "圓周運動常見情境",
      category: "力學",
      format: "互動",
      summary: "在不同圓周情境中辨認真正提供向心力的來源。",
      goal: ["判斷向心力由哪些實際作用力提供", "比較不同位置的速度與受力"],
      task: "每換一個情境，先指出圓心方向，再預測哪些力有徑向分量。",
      question: "同樣做圓周運動，向心力的來源為什麼可以不同？",
      demo: ["先標示圓心與徑向", "逐一切換生活情境", "最後才顯示合力或公式"],
      gesture: "用右側面板切換案例；小螢幕可先收合面板。"
    },
    {
      file: "曲率半徑.html",
      title: "曲率半徑",
      category: "力學",
      format: "幾何",
      summary: "用瞬時密切圓理解彎曲程度與運動方向的變化。",
      goal: ["以曲率半徑描述軌跡彎曲程度", "連結曲率、速度與法向加速度"],
      task: "先找出軌跡最彎的位置，預測那裡的曲率半徑較大或較小。",
      question: "速度不變時，曲率半徑變小會如何影響法向加速度？",
      demo: ["先只看軌跡的切線", "加入密切圓與圓心", "比較兩個不同彎曲位置"],
      gesture: "拖曳觀察點，追蹤切線與曲率圓如何改變。"
    },
    {
      file: "摩擦.html",
      title: "摩擦力",
      category: "力學",
      format: "2D",
      summary: "觀察靜摩擦力如何配合外力，直到轉為動摩擦。",
      goal: ["區分靜摩擦與動摩擦", "理解靜摩擦力不是永遠等於 μsN"],
      task: "逐步增加外力，先預測物體何時開始動，再記下臨界值。",
      question: "物體還沒動時，摩擦力為什麼會隨外力增加？",
      demo: ["從小外力慢慢增加", "在臨界值前後各暫停一次", "比較 fs(max) 與 fk"],
      gesture: "在觸控裝置上慢慢移動滑桿，觀察狀態文字切換。"
    },
    {
      file: "腳踏車的摩擦力.html",
      title: "腳踏車的摩擦力",
      category: "力學",
      format: "情境",
      summary: "從主動輪、被動輪的受力判斷摩擦力方向。",
      goal: ["判斷輪胎接觸點的相對滑動趨勢", "區分前後輪摩擦力的角色"],
      task: "先不看箭頭，判斷踩踏時前後輪接觸點各有何滑動趨勢。",
      question: "腳踏車前進時，兩輪受到的摩擦力一定都向前嗎？",
      demo: ["先說明主動輪與被動輪", "顯示接觸點運動趨勢", "最後揭示地面摩擦力"],
      gesture: "切換驅動與煞車情境，比較力箭頭方向。"
    },
    {
      file: "正向力與視重.html",
      title: "正向力與視重",
      category: "力學",
      format: "儀表",
      summary: "用方塊、電梯與漏砂情境分清楚重量、正向力與磅秤讀數。",
      goal: ["以牛頓第二定律求正向力", "用砂粒是否壓到沙漏底部解釋瞬時讀數"],
      task: "先預測沙漏剛開始漏砂、穩定流動與停止漏砂時，磅秤讀數如何變化。",
      question: "密閉沙漏的總質量沒變，漏砂時磅秤讀數就一定不變嗎？",
      demo: ["先完成全頁預測題", "依序觀察開始、穩定與結束三階段", "對照左側表格判斷砂粒是否正壓著底部"],
      gesture: "一次只改變一個變因，方便比較儀表反應。"
    },
    {
      file: "質重心.html",
      title: "質心與重心",
      category: "力學",
      format: "剛體",
      summary: "操弄形狀與支點，觀察質心、重心和穩定性的關係。",
      goal: ["找出複合物體的質心位置", "用重心投影判斷物體是否傾倒"],
      task: "改變配重前先預測質心移動方向，再測試物體能否保持平衡。",
      question: "物體的重心可能落在物體材料之外嗎？",
      demo: ["從對稱物體建立直覺", "加入不對稱配重", "比較質心投影與支撐面"],
      gesture: "拖曳物體或配重時，觀察標記是否同步移動。"
    },
    {
      file: "碰撞.html",
      title: "一維碰撞",
      category: "力學",
      format: "資料分析",
      summary: "比較動量守恆、動能變化與不同碰撞類型。",
      goal: ["用系統觀點檢驗動量守恆", "區分彈性與非彈性碰撞"],
      task: "先用質量與初速預測碰撞後方向，再查看動量、動能圖表。",
      question: "動量守恆時，動能也一定守恆嗎？",
      demo: ["先設定等質量案例", "再改成一重一輕", "用碰撞前後總量收尾"],
      gesture: "改完參數後重設再播放，避免混合不同案例。"
    },
    {
      file: "位能.html",
      title: "位能與能量轉換",
      category: "力學",
      format: "能量圖",
      summary: "追蹤動能、位能與總力學能在運動中的交換。",
      goal: ["辨識能量轉換而非能量消失", "用能量圖預測速度與轉折點"],
      task: "先從位能曲線標出可能運動區間，再播放檢查轉折點。",
      question: "總能量線與位能曲線相交的地方代表什麼？",
      demo: ["先固定總能量", "指出可達與不可達區", "加入摩擦比較機械能變化"],
      gesture: "拖曳初始位置後，先停下讀圖再播放。"
    },
    {
      file: "鉛質圓周運動.html",
      title: "鉛直圓周運動",
      category: "力學",
      format: "跨裝置",
      summary: "比較圓周各位置的速度、張力與維持圓周運動條件。",
      goal: ["分析重力的徑向分量", "判斷最高點維持圓周運動的最低速率"],
      task: "預測最高點速度太小會發生什麼，再逐步降低初速測試。",
      question: "最高點的張力最小值為何可以是零？",
      demo: ["先比較最高點與最低點受力", "顯示臨界速度", "稍降初速觀察軌跡失效"],
      gesture: "用暫停或慢速觀察最高點附近的數值。"
    },
    {
      file: "冷次定律(磁鐵動).html",
      title: "冷次定律・磁鐵移動",
      category: "電磁學",
      format: "3D",
      summary: "移動磁鐵，從磁通量變化判斷感應電流與磁場方向。",
      goal: ["以磁通量變化判斷感應方向", "用冷次定律解釋阻礙變化的意義"],
      task: "先預測磁鐵靠近與遠離時電流方向是否相同，再操作驗證。",
      question: "線圈反抗的是磁場本身，還是磁通量的變化？",
      demo: ["先固定磁鐵確認無感應", "分別靠近與遠離", "再翻轉磁極重做一次"],
      gesture: "緩慢拖曳磁鐵穿過線圈，注意移動方向與速度。"
    },
    {
      file: "冷次定律(線圈動).html",
      title: "冷次定律・線圈移動",
      category: "電磁學",
      format: "3D",
      summary: "改由線圈運動，檢驗感應現象取決於相對運動。",
      goal: ["說明相對運動造成磁通量改變", "比較線圈移動與磁鐵移動的等效性"],
      task: "保持磁鐵不動，預測線圈靠近時的感應方向，再與磁鐵移動版比較。",
      question: "若磁鐵與線圈同速同向移動，會有感應電流嗎？",
      demo: ["先回顧磁鐵移動版", "只移動線圈重現結果", "用相對速度統整"],
      gesture: "拖曳線圈時保持視角穩定，方便判讀方向。"
    },
    {
      file: "發電機.html",
      title: "發電機原理",
      category: "電磁學",
      format: "3D",
      summary: "從旋轉線圈的磁通量變化連結交流電壓波形。",
      goal: ["連結線圈角度、磁通量與感應電動勢", "比較交流與換向後輸出"],
      task: "先預測線圈在哪個角度電壓最大，再把 3D 位置對照波形。",
      question: "磁通量最大時，感應電動勢也最大嗎？",
      demo: ["慢速轉一圈建立角度對應", "同步指出波形斜率", "比較 AC 與 DC 換向"],
      gesture: "旋轉視角後用慢速播放，將線圈位置和圖表同步。"
    },
    {
      file: "電動機.html",
      title: "電動機原理",
      category: "電磁學",
      format: "3D",
      summary: "觀察載流線圈受力、力矩與換向器維持轉動的作用。",
      goal: ["用右手定則判斷線圈兩側受力", "說明換向器如何維持同向力矩"],
      task: "先在半圈處暫停，預測若不換向，接下來力矩方向會如何。",
      question: "換向器改變的是電流方向、磁場方向，還是兩者？",
      demo: ["先顯示兩側磁力", "關閉換向觀察往復", "開啟換向比較連續轉動"],
      gesture: "拖曳 3D 視角檢查電流、磁場、受力三方向。"
    },
    {
      file: "01圓形載流導線周圍磁場.html",
      title: "圓形載流導線磁場",
      category: "電磁學",
      format: "3D",
      summary: "用右手定則探索環形電流在空間中的磁場分布。",
      goal: ["以右手定則判斷軸線磁場方向", "比較電流、半徑與磁場強度"],
      task: "先判斷圓心磁場方向，再反轉電流確認整個場線如何改變。",
      question: "增加線圈半徑而維持電流時，圓心磁場會如何變化？",
      demo: ["先標出電流方向", "用右手捲曲建立磁場方向", "改變半徑與電流比較"],
      gesture: "旋轉模型從側面和軸線方向各看一次。"
    },
    {
      file: "帶電質點於磁場中運動.html",
      title: "帶電質點在磁場中運動",
      category: "電磁學",
      format: "3D",
      summary: "從洛倫茲力方向理解圓周與螺旋線運動。",
      goal: ["判斷正負電荷的磁力方向", "分解平行與垂直磁場的速度分量"],
      task: "先預測只改變速度平行分量時，螺旋半徑與螺距如何變化。",
      question: "磁力始終垂直速度，為什麼仍能改變粒子的運動？",
      demo: ["從純垂直速度的圓周開始", "加入平行速度形成螺旋", "切換電荷正負比較旋向"],
      gesture: "用 3D 視角沿磁場方向觀察圓周投影。"
    },
    {
      file: "惠更斯原理.html",
      title: "惠更斯原理",
      category: "波動學",
      format: "2D",
      summary: "從每個波前點產生次波，建構下一刻的新波前。",
      goal: ["說明次波包絡線如何形成新波前", "用惠更斯原理解釋波的傳播"],
      task: "先標出舊波前上三個點，預測同一時間後各次波半徑。",
      question: "新波前為什麼是所有次波的包絡線，而不是任意連線？",
      demo: ["先顯示單一點源次波", "增加多個次波", "最後連出共同包絡線"],
      gesture: "逐步播放比連續播放更適合觀察波前生成。"
    },
    {
      file: "波的折射、反射與全反射.html",
      title: "波的折射、反射與全反射",
      category: "波動學",
      format: "2D",
      summary: "操弄入射角與介質波速，對照反射、折射與臨界角。",
      goal: ["以波速變化解釋折射方向", "判斷全反射的條件"],
      task: "先預測進入較慢介質時折射線偏向或偏離法線，再調整入射角。",
      question: "全反射為什麼只會從特定的一側介質入射時發生？",
      demo: ["先固定小入射角比較兩介質", "逐步增大入射角", "在臨界角前後定格"],
      gesture: "慢慢調角度，留意臨界角附近的模式切換。"
    },
    {
      file: "波的繞射現象.html",
      title: "波的繞射",
      category: "波動學",
      format: "2D",
      summary: "比較波長與狹縫寬度，觀察繞射展開程度。",
      goal: ["由尺度比判斷繞射明顯程度", "用惠更斯原理解釋狹縫後波前"],
      task: "先猜 λ/a 在何種情況繞射最明顯，再各改一次波長與狹縫。",
      question: "縮小狹縫和增加波長，為何會造成相似的效果？",
      demo: ["先設定狹縫遠大於波長", "讓兩者尺度接近", "比較兩張波前圖"],
      gesture: "一次只調整波長或狹縫寬度其中之一。"
    },
    {
      file: "波的干涉與雙波源.html",
      title: "波的干涉與雙波源",
      category: "波動學",
      format: "2D",
      summary: "用路徑差找出建設性與破壞性干涉的位置。",
      goal: ["用路徑差判斷干涉型態", "連結雙曲線節線與兩波源距離"],
      task: "先選一點估計到兩波源的距離差，再用模擬顯示結果。",
      question: "節線上的水面真的完全不動嗎？在理想模型中代表什麼？",
      demo: ["先顯示單一波源", "加入第二波源", "選點量測路徑差"],
      gesture: "拖曳量測點跨過節線，觀察振幅如何改變。"
    },
    {
      file: "都卜勒效應.html",
      title: "都卜勒效應",
      category: "波動學",
      format: "雙視角",
      summary: "從波前間距與接收頻率比較波源、觀察者運動。",
      goal: ["區分波源移動與觀察者移動", "由波前壓縮或相遇率解釋頻率改變"],
      task: "先預測觀察者接近靜止波源時，介質中的波長是否改變。",
      question: "波源移動和觀察者移動都改變聽到的頻率，但波長也都改變嗎？",
      demo: ["先讓觀察者移動", "再固定觀察者、移動波源", "用雙視角比較波前"],
      gesture: "選定一種情境播放完整一段，再切換比較。"
    },
    {
      file: "波前.html",
      title: "波前概念",
      category: "波動學",
      format: "引導",
      summary: "從同相位點建立波前、波線與傳播方向的概念。",
      goal: ["指出同一波前上的同相位點", "分辨波前與波的傳播方向"],
      task: "先在波形上找出同相位的點，再猜測把它們連起來會得到什麼。",
      question: "波前上的點是同一時間到達，還是具有相同相位？",
      demo: ["從單點振動開始", "標出多個同相位點", "連線並加入垂直波線"],
      gesture: "依序開啟提示，不要一次顯示所有標記。"
    },
    {
      file: "波前與雙狹縫3D.html",
      title: "3D 波前與雙狹縫",
      category: "波動學",
      format: "3D",
      summary: "在三維空間連結圓形波前、雙狹縫與干涉曲線。",
      goal: ["從 3D 波前理解平面截線", "用路徑差辨認干涉位置"],
      task: "旋轉視角前先預測從上方看，球面波會呈現什麼形狀。",
      question: "同一個波動現象在 3D 與 2D 截面中各看見什麼？",
      demo: ["先用單狹縫建立 3D 波前", "切到俯視截面", "加入雙狹縫與路徑差"],
      gesture: "手機請橫放；雙指與單指操作時避免碰到側邊面板。"
    },
    {
      file: "駐波..html",
      title: "聲波駐波與管樂器",
      category: "波動學",
      format: "聲學",
      summary: "比較開管、閉管的節點、腹點與允許頻率。",
      goal: ["辨認位移節點與腹點", "比較開管、閉管的諧波條件"],
      task: "先畫出基頻波形，再預測下一個允許模態有幾個節點。",
      question: "閉管為什麼只出現特定的奇次諧波？",
      demo: ["先固定管長比較開閉端", "逐一增加模態", "用頻率比整理規律"],
      gesture: "切換模態後先暫停，數清節點與腹點。"
    },
    {
      file: "黑體輻射.html",
      title: "黑體輻射",
      category: "近代物理",
      format: "光譜圖",
      summary: "改變溫度，追蹤輻射峰值、總能量與可見光顏色。",
      goal: ["用維恩定律描述峰值波長", "比較溫度與曲線下面積"],
      task: "先預測升溫後曲線峰值往哪一側移動，再比較面積變化。",
      question: "物體變藍只代表峰值移動，還是所有波長的輻射都改變？",
      demo: ["先比較兩個明顯不同溫度", "指出峰值與可見光區", "最後討論曲線下面積"],
      gesture: "緩慢調整溫度，追蹤峰值標記而非只看顏色。"
    },
    {
      file: "波耳氫原子模型.html",
      title: "波耳氫原子模型",
      category: "近代物理",
      format: "原子模型",
      summary: "用量子化能階與躍遷解釋氫原子的線光譜。",
      goal: ["理解能階為離散值", "由能量差求出吸收或放出光子的頻率"],
      task: "先選一個躍遷，預測是吸收或放光以及光譜線大致位置。",
      question: "為什麼電子不是在任意半徑都能穩定存在？",
      demo: ["先顯示允許能階", "操作一個向下躍遷", "把能量差對照光譜線"],
      gesture: "逐次選擇躍遷，保留前一次結果做比較。"
    },
    {
      file: "光電效應.html",
      title: "光電效應",
      category: "近代物理",
      format: "實驗室",
      summary: "分別改變頻率與光強，釐清電子能量和數量的控制因素。",
      goal: ["區分光頻率與光強的作用", "由截止頻率與遏止電壓理解光子模型"],
      task: "先固定頻率只改光強，再固定光強只改頻率，比較電流與最大動能。",
      question: "增加低於截止頻率的光強，為什麼仍不能打出電子？",
      demo: ["先找出截止頻率", "在高於截止頻率後改光強", "用遏止電壓量最大動能"],
      gesture: "側欄可收合；一次只動一個控制量，方便讀圖。"
    },
    {
      file: "光譜實驗室.html",
      title: "光譜物理實驗室",
      category: "近代物理",
      format: "光譜",
      summary: "比較連續、發射與吸收光譜，從譜線辨認物質。",
      goal: ["辨認三類光譜的形成條件", "用特徵譜線連結元素能階"],
      task: "先比較同一元素的發射與吸收譜線，找出位置上的共同點。",
      question: "為什麼吸收光譜的暗線會與同元素發射光譜的亮線對齊？",
      demo: ["先展示連續光譜", "加入低密度熱氣體", "再用較冷氣體形成吸收線"],
      gesture: "橫向拖曳光譜區時，鎖定同一波長比較。"
    },
    {
      file: "陰極射線.html",
      title: "陰極射線與湯姆森實驗",
      category: "近代物理",
      format: "歷史實驗",
      summary: "用電場與磁場偏轉陰極射線，理解電子荷質比的測量。",
      goal: ["判斷帶電粒子在電磁場中的偏轉", "說明如何由平衡條件測得 e/m"],
      task: "先判斷射線的帶電正負，再調整場使光點回到未偏轉位置。",
      question: "同時使用電場與磁場，為什麼能先選出特定速率的粒子？",
      demo: ["先只開電場觀察偏轉", "再只開磁場", "最後讓兩作用力平衡"],
      gesture: "小幅調整場強，追蹤光點而不是快速拉動滑桿。"
    }
  ];

  const measurements = {
    "運動函數圖.html": { settingLabel: "運動模式與觀察時刻", settingPlaceholder: "例：等加速，t = 4.0 s", resultLabel: "x、v、a 或圖線特徵", resultPlaceholder: "例：x=32 m，v=16 m/s，a=4 m/s²", prompt: "選定同一觀察時刻，比較不同運動模式的 x、v、a 與圖線斜率。" },
    "卡文迪西實驗裝置.html": { settingLabel: "大球質量 M 與扭線係數 κ", settingPlaceholder: "例：M=100，κ=0.050", resultLabel: "平衡偏轉角或雷射位移", resultPlaceholder: "例：θ=…，光點位移=…", prompt: "固定扭線係數，逐次改變大球質量，比較穩定後的偏轉量。" },
    "SHM.html": { settingLabel: "模式與相位角 θ", settingPlaceholder: "例：水平 SHM，θ=90°", resultLabel: "位移、速度、加速度", resultPlaceholder: "例：x 最大、v=0、a 指向平衡點", prompt: "在 0°、90°、180° 等相位定格，記錄 x、v、a 的大小與方向。" },
    "等速圓周運動-錐動擺.html": { settingLabel: "切線速率 v 與擺錘質量 m", settingPlaceholder: "例：v=10.0 m/s，m=10 kg", resultLabel: "擺角、半徑與張力分量", resultPlaceholder: "例：θ=…，Tsinθ=…", prompt: "先固定質量改變速率，再固定速率改變質量，分辨幾何量與力的變化。" },
    "圓周.html": { settingLabel: "情境、速率 v、半徑 r", settingPlaceholder: "例：平路轉彎，v=12 m/s，r=40 m", resultLabel: "向心力大小與來源", resultPlaceholder: "例：Fc=… N，由摩擦力提供", prompt: "每次先選情境與圓心方向，再記錄提供徑向合力的實際作用力。" },
    "曲率半徑.html": { settingLabel: "法向加速度 an", settingPlaceholder: "例：an=150 px/s²", resultLabel: "曲率半徑 R=v²/an", resultPlaceholder: "例：R=267 px", prompt: "速度固定為 200 px/s，改變法向加速度並檢查 R 是否與 an 成反比。" },
    "摩擦.html": { settingLabel: "外力、角度、質量與摩擦係數", settingPlaceholder: "例：F=80 N，m=20 kg，μs=0.5", resultLabel: "摩擦狀態、摩擦力與加速度", resultPlaceholder: "例：靜止，f=80 N，a=0", prompt: "緩慢增加外力，特別記錄開始滑動前後的兩筆資料。" },
    "腳踏車的摩擦力.html": { settingLabel: "行駛狀態、施力與 μ", settingPlaceholder: "例：後輪驅動加速，施力=5，μ=0.5", resultLabel: "前後輪摩擦力方向／大小", resultPlaceholder: "例：後輪向前、前輪向後", prompt: "分別記錄加速、等速與煞車時前後輪接觸點的摩擦力方向。" },
    "正向力與視重.html": { settingLabel: "情境與觀察階段", settingPlaceholder: "例：沙漏剛開始漏砂", resultLabel: "磅秤讀數 N 與基準重量 W", resultPlaceholder: "例：N<W，讀數先變少", prompt: "分別記錄沙漏開始、穩定流動、停止流動，或電梯各加速度階段的磅秤讀數。" },
    "質重心.html": { settingLabel: "案例與質量／幾何參數", settingPlaceholder: "例：兩球模式，m1=30、m2=50", resultLabel: "質心位置或傾倒條件", resultPlaceholder: "例：質心偏向 m2，xcm=…", prompt: "先選定同一案例，再一次改變一個質量或幾何量，記錄質心如何移動。" },
    "碰撞.html": { settingLabel: "m1、v1、m2、v2 與碰撞類型", settingPlaceholder: "例：m1=1 kg，v1=4 m/s；m2=2 kg，v2=0", resultLabel: "碰後速度、總動量與總動能", resultPlaceholder: "例：v1'=…，v2'=…，ΔK=…", prompt: "每次保留碰撞前的總動量，並比較碰撞後動量與動能是否守恆。" },
    "位能.html": { settingLabel: "情境與 m、g、k、μ 或 e", settingPlaceholder: "例：彈簧，m=2 kg，k=15 N/m，μ=0", resultLabel: "動能、位能、總能量或轉折點", resultPlaceholder: "例：K=…，Us=…，E=…", prompt: "固定初始條件後改變一個參數，記錄能量比例與轉折位置。" },
    "鉛質圓周運動.html": { settingLabel: "情境模式、初始參數 x 與軌道／繩子模型", settingPlaceholder: "例：連續繞圓，x=2.5，繩子模型", resultLabel: "位置、速率與徑向受力", resultPlaceholder: "例：最高點，v=…，T=…", prompt: "同一組初始條件下，在最低點、側邊與最高點定格，分別記錄速率和徑向受力。" },
    "冷次定律(磁鐵動).html": { settingLabel: "磁極、移動方向與快慢", settingPlaceholder: "例：N 極快速靠近線圈", resultLabel: "磁通量變化與感應電流方向", resultPlaceholder: "例：Φ 增加，電流逆時針", prompt: "分別記錄靠近、遠離與靜止三種狀態，方向判斷須註明觀察視角。" },
    "冷次定律(線圈動).html": { settingLabel: "線圈位置與移動方向", settingPlaceholder: "例：由 x=-25 向右進入磁場", resultLabel: "ΔΦ 與感應電流／電子流方向", resultPlaceholder: "例：Φ 向下增加，I 逆時針", prompt: "比較磁場外、進入中、完全在內與離開時，磁通量是否改變。" },
    "發電機.html": { settingLabel: "AC/DC、角速度 ω 與磁場 B", settingPlaceholder: "例：AC，ω=2.0，B=2.0", resultLabel: "輸出波形、週期與峰值", resultPlaceholder: "例：交流正弦波，峰值=…", prompt: "固定磁場改變角速度，再固定角速度改變磁場，比較頻率與振幅。" },
    "電動機.html": { settingLabel: "DC/集電環、電壓 V 與磁場 B", settingPlaceholder: "例：換向器，V=5.0，B=2.0", resultLabel: "旋轉方向、力矩或轉速趨勢", resultPlaceholder: "例：順時針，力矩持續同向", prompt: "分別反轉電壓與磁場，檢查旋轉方向是否各反轉一次。" },
    "01圓形載流導線周圍磁場.html": { settingLabel: "電流方向、I、線圈半徑 R 與高度 a", settingPlaceholder: "例：逆時針，I=2.0 A，R=3.0，a=4.0", resultLabel: "軸線總磁場 Btotal 與方向", resultPlaceholder: "例：Btotal=…，方向 +z", prompt: "先固定電流方向與其中兩個數值，只改變 I、R 或 a 之一；最後反轉電流檢查磁場方向。" },
    "帶電質點於磁場中運動.html": { settingLabel: "速率 v、夾角 θ 與磁場 B", settingPlaceholder: "例：v=40，θ=60°，B=2.0", resultLabel: "迴旋半徑、週期與螺距", resultPlaceholder: "例：r=…，pitch=…，T=…", prompt: "分別改變平行與垂直速度分量，區分誰影響半徑、誰影響螺距。" },
    "惠更斯原理.html": { settingLabel: "波型、播放速度與觀察時刻", settingPlaceholder: "例：直線波、極慢速，次波半徑達 1 格時", resultLabel: "次波半徑與新波前形狀", resultPlaceholder: "例：所有次波等半徑，包絡線為直線", prompt: "分別選直線波與圓形波，用逐步或極慢速模式在相同時間比較次波及共同包絡線。" },
    "波的折射、反射與全反射.html": { settingLabel: "入射角 θ1、n1 與 n2", settingPlaceholder: "例：θ1=40°，n1=1.5，n2=1.0", resultLabel: "折射角 θ2 或全反射狀態", resultPlaceholder: "例：θ2=…；尚未全反射", prompt: "固定兩介質後逐步增加入射角，記錄臨界角前後的結果。" },
    "波的繞射現象.html": { settingLabel: "單狹縫／障礙物、波長 λ 與寬度 a", settingPlaceholder: "例：單狹縫，λ=0.60，a=1.20", resultLabel: "λ/a 與繞射展開程度", resultPlaceholder: "例：λ/a=0.50，繞射中等", prompt: "先固定單狹縫或障礙物模式，再安排相同 λ/a 的不同組合，檢查繞射程度是否相似。" },
    "波的干涉與雙波源.html": { settingLabel: "源距 d、波長 λ 與相位差", settingPlaceholder: "例：d=8.0 m，λ=2.5 m，相位=0°", resultLabel: "路徑差、干涉型態或節線數", resultPlaceholder: "例：Δr=λ，建設性干涉", prompt: "選定同一觀察點，改變 d、λ 或相位差之一並判斷干涉型態。" },
    "都卜勒效應.html": { settingLabel: "波源速度 vs、觀察者速度 vo、f0", settingPlaceholder: "例：vs=5 m/s，vo=0，f0=10 Hz", resultLabel: "接收頻率與波前間距", resultPlaceholder: "例：f'=… Hz，前方波長縮短", prompt: "分開比較只有波源移動與只有觀察者移動，別把兩種情境混成一筆。" },
    "波前.html": { settingLabel: "教學步驟與觀察時刻", settingPlaceholder: "例：慢動作，波峰通過藍色標記時", resultLabel: "同相位點、波前與傳播方向", resultPlaceholder: "例：同一波峰連線，波線垂直波前", prompt: "記錄標記代表的相位，以及波前和波線之間的幾何關係。" },
    "波前與雙狹縫3D.html": { settingLabel: "單／雙波源、波源距離 d 與相位差", settingPlaceholder: "例：雙波源，d=12，相位差=0°", resultLabel: "波前、節面／腹面與路徑差", resultPlaceholder: "例：中央為腹面，Δr=0", prompt: "用單波源辨認波前後，切換雙波源；先固定同相位改變距離，再固定距離改變相位差。" },
    "駐波..html": { settingLabel: "管型、長度 L、波速 v 與頻率 f", settingPlaceholder: "例：開管，L=1.0 m，v=340 m/s，f=170 Hz", resultLabel: "模態、節點／腹點與是否共振", resultPlaceholder: "例：基頻，兩端為腹點", prompt: "對同一管長逐次找出可共振頻率，記錄頻率比與節點數。" },
    "黑體輻射.html": { settingLabel: "黑體溫度 T", settingPlaceholder: "例：T=5500 K", resultLabel: "峰值波長 λmax 與相對強度", resultPlaceholder: "例：λmax≈527 nm，強度…", prompt: "逐次提高溫度，記錄峰值波長與曲線下面積的同步變化。" },
    "波耳氫原子模型.html": { settingLabel: "能量操作與操作前後能階", settingPlaceholder: "例：給予能量，n=2 → n=3", resultLabel: "吸收／放光、ΔE 與波長", resultPlaceholder: "例：釋放能量，λ≈656 nm（紅）", prompt: "每做一次給予或釋放能量，就記下實際的起始與終止能階，再判斷光子的能量和光譜位置。" },
    "光電效應.html": { settingLabel: "金屬、波長 λ、光強與電壓", settingPlaceholder: "例：鈉，λ=400 nm，強度=50%，V=0", resultLabel: "光電流、Kmax 或遏止電壓", resultPlaceholder: "例：有光電流，Kmax=… eV", prompt: "先固定波長改光強，再固定光強改波長，分開記錄電子數量與最大動能。" },
    "光譜實驗室.html": { settingLabel: "光源、氣體元素與元件配置", settingPlaceholder: "例：氫氣體管 → 稜鏡 → 屏幕", resultLabel: "光譜類型、特徵譜線波長與顏色", resultPlaceholder: "例：發射光譜，656 nm 紅、486 nm 青", prompt: "先完成連續、發射與吸收三種配置；再對同一元素比較發射亮線與吸收暗線的位置。" },
    "陰極射線.html": { settingLabel: "電場 E、磁場 B 與場方向", settingPlaceholder: "例：E=…，B=…，磁場入紙面", resultLabel: "光點偏轉、平衡或軌跡半徑", resultPlaceholder: "例：光點回到中央，v=E/B", prompt: "依序只開電場、只開磁場、同時開啟並調到平衡，分成三筆記錄。" }
  };

  for (const activity of activities) {
    activity.measure = Object.freeze(measurements[activity.file] || {
      settingLabel: "本次控制條件",
      settingPlaceholder: "寫下實際改變的控制量",
      resultLabel: "可觀察的物理結果",
      resultPlaceholder: "記錄數值、方向或圖形特徵",
      prompt: "一次只改變一個控制量，並用模擬中實際顯示的物理量記錄結果。"
    });
  }

  const paths = [
    {
      id: "forces-energy",
      title: "從運動圖到能量守恆",
      category: "力學",
      duration: 45,
      summary: "先用圖形描述運動，再以力、碰撞與能量建立同一套因果鏈。",
      question: "同一段運動，可以同時用力、運動函數圖與能量怎麼描述？",
      files: ["運動函數圖.html", "摩擦.html", "碰撞.html", "位能.html"]
    },
    {
      id: "circular-motion",
      title: "向心力不是一個新力",
      category: "力學",
      duration: 40,
      summary: "從錐動擺、常見情境到鉛直圓周，反覆辨認徑向合力。",
      question: "不同圓周運動中，真正指向圓心的是哪些力的合力？",
      files: ["等速圓周運動-錐動擺.html", "圓周.html", "鉛質圓周運動.html", "曲率半徑.html"]
    },
    {
      id: "electromagnetic-machines",
      title: "從磁通量到電機",
      category: "電磁學",
      duration: 50,
      summary: "串連磁場、冷次定律、發電機與電動機的能量轉換。",
      question: "磁場、運動與電流如何在發電機和電動機中交換角色？",
      files: ["01圓形載流導線周圍磁場.html", "冷次定律(磁鐵動).html", "冷次定律(線圈動).html", "發電機.html", "電動機.html"]
    },
    {
      id: "wave-models",
      title: "從波前到干涉圖樣",
      category: "波動學",
      duration: 55,
      summary: "用惠更斯原理一路解釋折射、繞射與雙波源干涉。",
      question: "同一套次波模型，如何解釋波遇到介面、狹縫與另一個波源？",
      files: ["波前.html", "惠更斯原理.html", "波的折射、反射與全反射.html", "波的繞射現象.html", "波的干涉與雙波源.html", "波前與雙狹縫3D.html"]
    },
    {
      id: "quantum-light",
      title: "光的能量與量子證據",
      category: "近代物理",
      duration: 50,
      summary: "從黑體、光電效應、原子能階到光譜，追蹤量子化的證據。",
      question: "哪些實驗現象無法只用經典波動觀點完整解釋？",
      files: ["黑體輻射.html", "光電效應.html", "波耳氫原子模型.html", "光譜實驗室.html"]
    }
  ];

  window.PhysicsClassroom = Object.freeze({
    activities: Object.freeze(activities),
    paths: Object.freeze(paths),
    categories: Object.freeze(["全部", "力學", "電磁學", "波動學", "近代物理"]),
    version: "2026.2"
  });
})();

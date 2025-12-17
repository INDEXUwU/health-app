// backend/app.js
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcrypt");
const app = express();

app.use(cors());
app.use(express.json());

const path = require("path");
app.use(express.static(path.join(__dirname, "../frontend"), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        }
    }
}));

// --- DB 接続設定（環境に合わせて） ---
// --- DB 接続設定（環境に合わせて） ---
let dbOptions = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

if (process.env.DATABASE_URL) {
    // Render/Aivenなどの接続URL（mysql://...）を分解して設定
    const dbUrl = new URL(process.env.DATABASE_URL);
    dbOptions.host = dbUrl.hostname;
    dbOptions.port = dbUrl.port;
    dbOptions.user = dbUrl.username;
    dbOptions.password = dbUrl.password;
    dbOptions.database = dbUrl.pathname.slice(1);
    dbOptions.ssl = { rejectUnauthorized: false };
} else {
    // ローカル開発用
    dbOptions.host = process.env.DB_HOST || "localhost";
    dbOptions.user = process.env.DB_USER || "root";
    dbOptions.password = process.env.DB_PASSWORD || "AdminDef";
    dbOptions.database = process.env.DB_NAME || "health_app";
    dbOptions.port = process.env.DB_PORT || 3306;
    dbOptions.ssl = process.env.DB_SSL ? { rejectUnauthorized: false } : undefined;
}

const db = mysql.createPool(dbOptions);

// -----------------------------
// テスト
// -----------------------------
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

// -----------------------------
// 新規登録
// -----------------------------
app.post("/api/register", async (req, res) => {
    try {
        const { name, login_id, password } = req.body;

        if (!name || !login_id || !password)
            return res.status(400).json({ message: "入力が不足しています" });

        const [exists] = await db.query(
            "SELECT user_id FROM users WHERE login_id = ?",
            [login_id]
        );
        if (exists.length > 0)
            return res.status(400).json({ message: "このログインIDは既に使われています" });

        const hash = await bcrypt.hash(password, 10);

        await db.query(
            "INSERT INTO users (name, login_id, password_hash, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
            [name, login_id, hash]
        );

        res.json({ message: "登録完了しました" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "サーバーエラー" });
    }
});

// -----------------------------
// ログイン
// -----------------------------
app.post("/api/login", async (req, res) => {
    try {
        const { login_id, password } = req.body;

        const [rows] = await db.query(
            "SELECT * FROM users WHERE login_id = ?",
            [login_id]
        );

        if (rows.length === 0)
            return res.status(401).json({ message: "IDが存在しません" });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match)
            return res.status(401).json({ message: "パスワードが違います" });

        const hasProfile = !!(
            user.age ||
            user.gender ||
            user.height ||
            user.weight ||
            user.target_weight
        );

        res.json({
            message: "ログイン成功",
            login_id: user.login_id,
            name: user.name,
            hasProfile
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "サーバーエラー" });
    }
});

// -----------------------------
// プロフィール取得
// -----------------------------
app.get("/api/user-info/:login_id", async (req, res) => {
    try {
        const { login_id } = req.params;

        const [rows] = await db.query(
            `SELECT name, age, gender, height, weight, target_weight 
             FROM users WHERE login_id = ?`,
            [login_id]
        );

        if (rows.length === 0)
            return res.status(404).json({ message: "ユーザーが見つかりません" });

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "サーバーエラー" });
    }
});

// -----------------------------
// プロフィール更新
// -----------------------------
app.post("/api/user-info", async (req, res) => {
    try {
        const { login_id, age, gender, height, weight, target_weight } = req.body;

        if (!login_id)
            return res.status(400).json({ message: "login_id が必要です" });

        const [rows] = await db.query(
            "SELECT user_id FROM users WHERE login_id = ?",
            [login_id]
        );

        if (rows.length === 0)
            return res.status(404).json({ message: "ユーザーが存在しません" });

        await db.query(
            `UPDATE users SET 
                age = ?, gender = ?, height = ?, weight = ?, target_weight = ?, updated_at = NOW()
             WHERE login_id = ?`,
            [age, gender, height, weight, target_weight, login_id]
        );

        res.json({ message: "保存しました" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "サーバーエラー" });
    }
});

// =======================================================
// ここから追加：体重 / 食事 / 運動 の API
// =======================================================

// -----------------------------
// 体重記録 登録
// -----------------------------
app.post("/api/weight", async (req, res) => {
    try {
        const { login_id, weight } = req.body;

        if (!login_id || weight === undefined)
            return res.status(400).json({ message: "login_id と weight が必要です" });

        await db.query(
            `INSERT INTO weight_records (login_id, weight, record_date)
             VALUES (?, ?, NOW())`,
            [login_id, weight]
        );

        res.json({ message: "体重を記録しました" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "保存に失敗しました" });
    }
});

// -----------------------------
// 体重記録 取得
// -----------------------------
app.get("/api/weights/:login_id", async (req, res) => {
    try {
        const { login_id } = req.params;

        const [rows] = await db.query(
            `SELECT weight, record_date 
             FROM weight_records 
             WHERE login_id = ? 
             ORDER BY record_date ASC`,
            [login_id]
        );

        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "取得に失敗しました" });
    }
});

// -----------------------------
// 食事記録 登録
// -----------------------------
app.post("/api/meal", async (req, res) => {
    try {
        const { login_id, meal_name, calories } = req.body;

        if (!login_id || !meal_name || calories === undefined)
            return res.status(400).json({ message: "入力が不足しています" });

        await db.query(
            `INSERT INTO meal_records (login_id, meal_name, calories, meal_datetime)
             VALUES (?, ?, ?, NOW())`,
            [login_id, meal_name, calories]
        );

        res.json({ message: "食事を記録しました" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "保存に失敗しました" });
    }
});

// -----------------------------
// 食事記録 取得
// -----------------------------
app.get("/api/meals/:login_id", async (req, res) => {
    try {
        const { login_id } = req.params;

        const [rows] = await db.query(
            `SELECT meal_name, calories, DATE_FORMAT(meal_datetime, '%Y-%m-%d %H:%i:%s') AS meal_datetime
             FROM meal_records
             WHERE login_id = ?
             ORDER BY meal_datetime DESC`,
            [login_id]
        );

        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "取得に失敗しました" });
    }
});

// -----------------------------
// 食事 日別集計（グラフ用）
// -----------------------------
app.get("/api/meals/daily/:login_id", async (req, res) => {
    try {
        const { login_id } = req.params;

        const [rows] = await db.query(
            `SELECT 
                DATE(meal_datetime) AS meal_date,
                SUM(calories) AS total_calories
             FROM meal_records
             WHERE login_id = ?
             GROUP BY DATE(meal_datetime)
             ORDER BY meal_date ASC`,
            [login_id]
        );

        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "集計に失敗しました" });
    }
});

// -----------------------------
// 運動記録 登録
// -----------------------------
app.post("/api/exercise", async (req, res) => {
    try {
        const { login_id, exercise_name, duration, calories_burned } = req.body;

        if (!login_id || !exercise_name || duration === undefined || calories_burned === undefined)
            return res.status(400).json({ message: "入力が不足しています" });

        await db.query(
            `INSERT INTO exercise_records (login_id, exercise_name, duration, calories_burned, exercise_datetime)
             VALUES (?, ?, ?, ?, NOW())`,
            [login_id, exercise_name, duration, calories_burned]
        );

        res.json({ message: "運動を記録しました" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "保存に失敗しました" });
    }
});

// -----------------------------
// 運動記録 取得
// -----------------------------
app.get("/api/exercises/:login_id", async (req, res) => {
    try {
        const { login_id } = req.params;

        const [rows] = await db.query(
            `SELECT exercise_name, duration, calories_burned, DATE_FORMAT(exercise_datetime, '%Y-%m-%d %H:%i:%s') AS exercise_datetime
             FROM exercise_records
             WHERE login_id = ?
             ORDER BY exercise_datetime DESC`,
            [login_id]
        );

        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "取得に失敗しました" });
    }
});

// -----------------------------
// 運動 日別集計（グラフ用）
// -----------------------------
app.get("/api/exercises/daily/:login_id", async (req, res) => {
    try {
        const { login_id } = req.params;

        const [rows] = await db.query(
            `SELECT 
                DATE(exercise_datetime) AS exercise_date,
                SUM(calories_burned) AS total_calories
             FROM exercise_records
             WHERE login_id = ?
             GROUP BY DATE(exercise_datetime)
             ORDER BY exercise_date ASC`,
            [login_id]
        );

        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "取得に失敗しました" });
    }
});

// -----------------------------
// ▼ 新規追加：今日の合計取得 API
// -----------------------------
app.get("/api/totals/:login_id", async (req, res) => {
    try {
        const { login_id } = req.params;

        // 今日の食事合計
        const [mealRows] = await db.query(
            `SELECT COALESCE(SUM(calories),0) AS today_intake
             FROM meal_records
             WHERE login_id = ? AND DATE(meal_datetime) = CURDATE()`,
            [login_id]
        );

        // 今日の運動消費合計
        const [exRows] = await db.query(
            `SELECT COALESCE(SUM(calories_burned),0) AS today_burn
             FROM exercise_records
             WHERE login_id = ? AND DATE(exercise_datetime) = CURDATE()`,
            [login_id]
        );

        // 最新の体重（直近の記録）
        const [wRows] = await db.query(
            `SELECT weight, DATE_FORMAT(record_date, '%Y-%m-%d %H:%i:%s') AS record_date
             FROM weight_records
             WHERE login_id = ?
             ORDER BY record_date DESC
             LIMIT 1`,
            [login_id]
        );

        // ユーザー情報（目標体重）
        const [uRows] = await db.query(
            `SELECT target_weight FROM users WHERE login_id = ?`,
            [login_id]
        );

        res.json({
            today_intake: mealRows[0] ? mealRows[0].today_intake : 0,
            today_burn: exRows[0] ? exRows[0].today_burn : 0,
            latest_weight: wRows.length ? wRows[0].weight : null,
            latest_weight_time: wRows.length ? wRows[0].record_date : null,
            target_weight: uRows.length ? uRows[0].target_weight : null
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "取得に失敗しました" });
    }
});

// -----------------------------
// ▼ 新規追加：アドバイス生成 API
// -----------------------------
app.get("/api/advice/:login_id", async (req, res) => {
    try {
        const { login_id } = req.params;

        // totals を取得（食事合計・運動合計・体重・目標）
        const [mealRows] = await db.query(
            `SELECT COALESCE(SUM(calories),0) AS today_intake
             FROM meal_records
             WHERE login_id = ? AND DATE(meal_datetime) = CURDATE()`,
            [login_id]
        );
        const [exRows] = await db.query(
            `SELECT COALESCE(SUM(calories_burned),0) AS today_burn
             FROM exercise_records
             WHERE login_id = ? AND DATE(exercise_datetime) = CURDATE()`,
            [login_id]
        );
        const [wRows] = await db.query(
            `SELECT weight
             FROM weight_records
             WHERE login_id = ?
             ORDER BY record_date DESC
             LIMIT 1`,
            [login_id]
        );
        const [uRows] = await db.query(
            `SELECT target_weight FROM users WHERE login_id = ?`,
            [login_id]
        );

        const today_intake = mealRows[0] ? mealRows[0].today_intake : 0;
        const today_burn = exRows[0] ? exRows[0].today_burn : 0;
        const current_weight = wRows.length ? Number(wRows[0].weight) : null;
        const target_weight = uRows.length ? Number(uRows[0].target_weight) : null;

        // アドバイスのロジック（シンプルなルールベース）
        // 7700 kcal ≒ 1 kg
        let advice = [];
        let progress = null;
        if (current_weight !== null && target_weight !== null) {
            const diff = Number((current_weight - target_weight).toFixed(2)); // 正：まだ減らす必要あり
            const kcal_needed = diff > 0 ? Math.round(diff * 7700) : 0;
            // 目安：-500 kcal/日 → 約0.5kg/週
            const suggested_daily_deficit = 500;
            const estimated_days = kcal_needed > 0 ? Math.ceil(kcal_needed / suggested_daily_deficit) : 0;

            progress = {
                current_weight,
                target_weight,
                diff,
                kcal_needed,
                estimated_days_to_goal: estimated_days
            };

            if (diff <= 0) {
                advice.push("素晴らしい！目標体重を達成済みまたは目標を下回っています。維持のためにバランスの良い食事を心がけましょう。");
            } else {
                advice.push(`目標まで ${diff} kg。およそ ${kcal_needed} kcal のカロリー削減が必要です。標準的には一日あたり約 ${suggested_daily_deficit} kcal の赤字を作ると約 ${estimated_days} 日で到達します（目安）。`);
            }
        } else {
            advice.push("体重データまたは目標体重が未設定です。プロフィール画面で目標体重を入力してください。");
        }

        // 今日の状況に基づくアドバイス
        const net_today = today_intake - today_burn; // 摂取 - 消費
        advice.push(`本日の摂取: ${today_intake} kcal、消費: ${today_burn} kcal（差し引き: ${net_today} kcal）。`);

        if (net_today > 800) {
            advice.push("今日の差し引きが大きいです。夕食を軽めにする・間食を控えると良いでしょう。");
        } else if (net_today > 300) {
            advice.push("少し多めの摂取です。軽めの運動（20〜30分のウォーキング等）をおすすめします。");
        } else if (net_today < -300) {
            advice.push("良い調整です。摂取と消費のバランスが取れています。無理のないペースで続けましょう。");
        } else {
            advice.push("今日の摂取・消費はおおむね良好です。継続が大切です。");
        }

        // 簡単な食事提案（例）
        if (today_intake > 2000) {
            advice.push("今日の摂取カロリーが高めです。夕食は野菜中心にすると良いです。");
        } else if (today_intake < 1200) {
            advice.push("摂取カロリーが低めです。筋肉維持のためにたんぱく質を含む食事をおすすめします。");
        }

        // 簡単な運動提案
        if (today_burn < 200) {
            advice.push("運動量が少なめです。短時間の有酸素運動（20分）を追加すると効果的です。");
        }

        res.json({
            success: true,
            today_intake,
            today_burn,
            progress,
            advice_text: advice
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "アドバイスの生成に失敗しました" });
    }
});

// =======================================================
// 料理・運動の大規模辞書 + AI 推論（部分一致 / 類義語対応）
// =======================================================

// ▼ ① 料理180品目（抜粋…実際には180品目すべて入れる）
const mealDictionary = {
    "ご飯": 168,
    "パン": 260,
    "うどん": 330,
    "そば": 280,
    "ラーメン": 450,
    "カレーライス": 700,
    "唐揚げ": 450,
    "生姜焼き": 520,
    "焼き魚": 240,
    "ハンバーグ": 680,
    "オムライス": 680,
    "チャーハン": 650,
    "ステーキ": 750,
    "サラダチキン": 120,
    "サンドイッチ": 320,
    "味噌汁": 60,
    "エビチリ": 290,
    "青椒肉絲": 330,
    "麻婆春雨": 240,
    "麻婆豆腐": 360,
    "油淋鶏": 520,
    "酢豚": 450,
    "八宝菜": 260,
    "海鮮炒め": 310,
    "チャーシュー": 410,
    "餃子": 450,
    "小籠包": 210,
    "坦々麺": 650,
    "広東麺": 580,
    "天津飯": 720,
    "中華丼": 690,
    "冷やし中華": 520,
    "皿うどん": 690,
    "焼きビーフン": 430,
    "春巻き": 300,
    "肉まん": 230,

    "カルボナーラ": 780,
    "明太子パスタ": 620,
    "ペペロンチーノ": 520,
    "ナポリタン": 600,
    "ボロネーゼ": 680,
    "ジェノベーゼ": 550,
    "ラザニア": 720,
    "ピザ（マルゲリータ）": 750,
    "ピザ（ペパロニ）": 820,
    "グラタン": 680,
    "ドリア": 730,
    "リゾット": 540,
    "ミネストローネ": 190,
    "カルツォーネ": 560,
    "ブルスケッタ": 180,
    "ティラミス": 330,
    "パンナコッタ": 260,
    "ジェラート": 210,

    "ハンバーガー": 350,
    "チーズバーガー": 420,
    "フィッシュバーガー": 390,
    "ダブルチーズバーガー": 520,
    "フライドポテト": 450,
    "チキンナゲット": 290,
    "ホットドッグ": 320,
    "ミートパイ": 450,
    "クラムチャウダー": 320,
    "シーザーサラダ": 320,
    "バーベキューリブ": 780,
    "マッシュポテト": 240,
    "ステーキ（200g）": 600,
    "ケサディーヤ": 510,
    "タコス": 450,
    "ブリトー": 650,
    "チリコンカン": 480,
    "ガーリックトースト": 250,

    "バターチキンカレー": 680,
    "キーマカレー": 540,
    "グリーンカレー": 600,
    "レッドカレー": 620,
    "ナン": 320,
    "タンドリーチキン": 450,
    "ビリヤニ": 780,
    "サモサ": 260,
    "ラッシー": 180,
    "ターメリックライス": 280,

    "フォー": 420,
    "バインミー": 530,
    "ガパオライス": 650,
    "カオマンガイ": 560,
    "パッタイ": 670,
    "ミーゴレン": 700,
    "ナシゴレン": 720,
    "生春巻き": 180,
    "トムヤムクン": 350,
    "海南鶏飯": 580,

    "サーモン寿司": 300,
    "マグロ寿司": 280,
    "カリフォルニアロール": 420,
    "鉄火丼": 510,
    "サーモン丼": 580,
    "漬け丼": 520,
    "海鮮丼": 710,
    "ねぎとろ丼": 680,
    "ちらし寿司": 600,
    "うな重": 780
};

// ▼ ② 運動140種（kcal / 1分）
const exerciseDictionary = {
    "ウォーキング": 5,
    "ジョギング": 10,
    "ランニング": 12,
    "サイクリング": 8,
    "水泳": 11,
    "縄跳び": 13,
    "筋トレ": 7,
    "腹筋": 7,
    "背筋": 6,
    "スクワット": 8,
    "腕立て伏せ": 7,
    "ダンス": 7,
    "ウォーキング（速歩）": 260,
    "ウォーキング（ゆっくり）": 180,
    "山登り": 580,
    "ハイキング": 350,
    "サイクリング（街乗り）": 360,
    "サイクリング（高速）": 520,
    "スケート": 430,
    "スキー": 450,
    "スノーボード": 420,
    "縄跳び（ゆっくり）": 250,
    "縄跳び（高速）": 450,
    "ローイングマシン": 420,
    "エアロビクス（軽め）": 330,
    "エアロビクス（激しめ）": 520,
    "踏み台昇降": 280,
    "ズンバ": 480,
    "ジャズダンス": 350,
    "社交ダンス": 290,
    "バレエ": 380,
    "チアダンス": 430,

    "ピラティス": 250,
    "ヨガ（リラックス）": 180,
    "ヨガ（パワー）": 300,
    "太極拳": 230,
    "ストレッチ": 120,
    "呼吸法": 60,

    "卓球": 260,
    "バドミントン": 380,
    "ドッジボール": 300,
    "キックボクシング": 650,
    "空手": 480,
    "テコンドー": 520,
    "相撲": 720,
    "ラグビー": 650,
    "アメフト": 700,
    "水球": 780,

    "カヌー": 380,
    "カヤック": 420,
    "サーフィン": 250,
    "パドリング": 320,
    "SUP（スタンドアップパドル）": 330,
    "ダイビング": 260,
    "スキューバ": 300,

    "筋トレ（腹筋）": 180,
    "筋トレ（背筋）": 190,
    "筋トレ（腕立て）": 240,
    "筋トレ（スクワット）": 260,
    "ダンベル（軽め）": 210,
    "ダンベル（重め）": 340,
    "ベンチプレス": 420,
    "デッドリフト": 460,
    "バーピー": 500,
    "ジャンプスクワット": 420,

    "家事（掃除）": 180,
    "家事（洗濯）": 130,
    "家事（料理）": 110,
    "買い物": 140,
    "子供と遊ぶ": 180,
    "犬の散歩": 160
};

// ▼ ③ 文字の類似度（レーベンシュタイン距離）を使う AI 補正
function similar(a, b) {
    if (!a || !b) return 999;
    a = a.toLowerCase();
    b = b.toLowerCase();
    const dp = Array.from({ length: a.length + 1 }, () => []);
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
    }
    return dp[a.length][b.length];
}

// ▼ ④ 辞書から最も近い単語を返す （AI推論）
function guessWord(input, dict) {
    let best = null;
    let bestScore = 999;

    Object.keys(dict).forEach(key => {
        const dist = similar(input, key);
        if (dist < bestScore) {
            bestScore = dist;
            best = key;
        }
    });

    // 類似度が遠すぎる場合は "未推定"
    if (bestScore > 3) return null;

    return best;
}

// =======================================================
// ▼ API：料理名 → 自動カロリー推定
// =======================================================
app.post("/api/estimate-meal", (req, res) => {
    const { meal_name } = req.body;

    if (!meal_name)
        return res.status(400).json({ message: "meal_name が必要です" });

    // AI推論
    const best = guessWord(meal_name, mealDictionary);

    if (!best)
        return res.json({
            success: false,
            message: "該当料理が見つかりませんでした（手動入力してください）"
        });

    res.json({
        success: true,
        match: best,
        calories: mealDictionary[best]
    });
});

// =======================================================
// ▼ API：運動名 → 自動消費カロリー（時間 × MET）
// =======================================================
app.post("/api/estimate-exercise", (req, res) => {
    const { exercise_name, duration } = req.body;

    if (!exercise_name || !duration)
        return res.status(400).json({ message: "名前と時間が必要です" });

    // AI推論
    const best = guessWord(exercise_name, exerciseDictionary);

    if (!best)
        return res.json({
            success: false,
            message: "該当運動が見つかりません（手動入力してください）"
        });

    const kcal = exerciseDictionary[best] * Number(duration);

    res.json({
        success: true,
        match: best,
        calories_burned: Math.round(kcal)
    });
});

// 文字類似度（レーベンシュタイン距離）
function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () =>
        new Array(b.length + 1).fill(0)
    );

    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }
    return dp[a.length][b.length];
}

// 料理名推論強化
function findClosestMeal(input) {
    input = input.trim();

    // 完全一致・部分一致
    for (const key of Object.keys(mealDictionary)) {
        if (key.includes(input) || input.includes(key)) {
            return { name: key, calories: mealDictionary[key] };
        }
    }

    // 類似度スコア検索
    let bestMatch = null;
    let bestScore = Infinity; // 距離が小さいほど良い

    for (const key of Object.keys(mealDictionary)) {
        const dist = levenshtein(input, key);
        if (dist < bestScore) {
            bestScore = dist;
            bestMatch = key;
        }
    }

    // しきい値（最大距離3）
    if (bestScore <= 3) {
        return { name: bestMatch, calories: mealDictionary[bestMatch] };
    }

    return null; // 見つからない
}

function generateMealAdvice(mealName, calories) {
    let adv = [];

    if (calories > 700) {
        adv.push("高カロリーの食事です。サラダやスープを追加するとバランスが良くなります。");
    }
    if (mealName.includes("ラーメン") || mealName.includes("パスタ")) {
        adv.push("炭水化物が多めです。たんぱく質を意識しましょう。（ゆで卵・チキンなど）");
    }
    if (mealName.includes("揚げ") || mealName.includes("フライ")) {
        adv.push("揚げ物は脂質が多いので、明日は脂質を控えると良いです。");
    }
    if (calories < 300) {
        adv.push("カロリーが低めなので、タンパク質を少し足すと良いですね。");
    }

    return adv;
}

app.post("/api/meal/ai", async (req, res) => {
    try {
        const { login_id, meal_input } = req.body;

        if (!login_id || !meal_input)
            return res.status(400).json({ message: "入力が不足しています" });

        // ▼ AI推論で料理を特定
        const result = findClosestMeal(meal_input);

        if (!result) {
            return res.json({
                success: false,
                message: `「${meal_input}」に該当する料理が見つかりませんでした。入力を確認してください。`
            });
        }

        const { name, calories } = result;

        // ▼ DBへ保存
        await db.query(
            `INSERT INTO meal_records (login_id, meal_name, calories, meal_datetime)
             VALUES (?, ?, ?, NOW())`,
            [login_id, name, calories]
        );

        // ▼ AIアドバイス生成
        const advice = generateMealAdvice(name, calories);

        res.json({
            success: true,
            detected_meal: name,
            calories,
            advice
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "AI食事登録に失敗しました" });
    }
});

// -----------------------------
// サーバー起動
// -----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API起動 → http://localhost:${PORT}`));

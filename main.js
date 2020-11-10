/* jshint curly:true, debug:true */
/* globals $, firebase */


 // アコーディオンのタイトルがクリックされたら
$('.accordion-title a').on('click', (e) => {
  // hrefにページ遷移しない
  e.preventDefault();
    
  // 同じsection内の.accordion-contentを選択
  const content = $(e.target)
    .closest('section')
    .find('.accordion-content');
    
    // クリックされたコンテンツを表示
    content.slideToggle();
  });
  
/**
 * ----------------------
 * すべての画面共通で使う関数
 * ----------------------
 */

// ビュー（画面）を変更する
const showView = (id) => {
  $('.view').hide();
  $(`#${id}`).fadeIn();

 if (id === 'home') {
    loadManualListView();
  }
};
  
/**
 * -------------------------
 * マニュアル追加モーダル関連の処理
 * -------------------------
 */

// 書籍の登録モーダルを初期状態に戻す
const resetAddManualModal = () => {
  $('#manual-form')[0].reset();
  $('#add-manual-image-label').text('');
  $('#submit_add_manual')
    .prop('disabled', false)
    .text('保存する');
};

// 選択した表紙画像の、ファイル名を表示する
$('#add-manual-image').on('change', (e) => {
  const input = e.target;
  const $label = $('#add-manual-image-label');
  const file = input.files[0];

  if (file != null) {
    $label.text(file.name);
  } else {
    $label.text('ファイルを選択');
  }
});

// 書籍の登録処理
$('#manual-form').on('submit', (e) => {
  e.preventDefault();

  // 書籍の登録ボタンを押せないようにする
  $('#submit_add_manual')
    .prop('disabled', true)
    .text('送信中…');

  // マニュアルのタイトル
  const manualTitle = $('#add-manual-title').val();
  
  // 材料の内容
  const manualMaterial = $('#add-material-content').val();
  
  // マニュアルの内容
  const manualContent = $('#add-manual-content').val();
  
  // カテゴリー
  const manualcategory = $('[name="category"] option:selected').val();

  const $manualImage = $('#add-manual-image');
  const { files } = $manualImage[0];

  if (files.length === 0) {
    // ファイルが選択されていないなら何もしない
    return;
  }

  const file = files[0]; // 表紙画像ファイル
  const filename = file.name; // 画像ファイル名
  const manualImageLocation = `manual-images/${filename}`; // 画像ファイルのアップロード先

  // 書籍データを保存する
  firebase
    .storage()
    .ref(manualImageLocation)
    .put(file) // Storageへファイルアップロードを実行
    .then(() => {
      // Storageへのアップロードに成功したら、Realtime Databaseに書籍データを保存する
      const manualData = {
        manualTitle,
        manualImageLocation,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        manualMaterial,
        manualContent,
        manualcategory
      };
      return firebase
        .database()
        .ref('manuals')
        .push(manualData);
    })
    .then(() => {
      // 書籍一覧画面の書籍の登録モーダルを閉じて、初期状態に戻す
      $('#add-manual-modal').modal('hide');
      resetAddManualModal();
    })
    .catch((error) => {
      // 失敗したとき
      console.error('エラー', error);
      resetAddManualModal();
      $('#add-manual__help')
        .text('保存できませんでした。')
        .fadeIn();
    });
});

/**
 * -------------------------
 * ログイン・ログアウト関連の関数
 * -------------------------
 */

// ログインフォームを初期状態に戻す
const resetLoginForm = () => {
  $('#login__help').hide();
  $('#login__submit-button')
    .prop('disabled', false)
    .text('ログイン');
};

// ログインした直後に呼ばれる
const onLogin = () => {
  console.log('ログイン完了');

  // 書籍一覧画面を表示
  showView('home');
};

// ログアウトした直後に呼ばれる
const onLogout = () => {
  const booksRef = firebase.database().ref('books');

  // 過去に登録したイベントハンドラを削除
  booksRef.off('child_removed');
  booksRef.off('child_added');

  showView('login');
};

/**
 * ------------------
 * イベントハンドラの登録
 * ------------------
 */

// ログイン状態の変化を監視する
firebase.auth().onAuthStateChanged((user) => {
  // ログイン状態が変化した
  if (user) {
    // ログイン済
    onLogin();
  } else {
    // 未ログイン
    onLogout();
  }
});

// ログインフォームが送信されたらログインする
$('#login-form').on('submit', (e) => {
  e.preventDefault();

  const $loginButton = $('#login__submit-button');
  $loginButton.text('送信中…');

  const email = $('#login-email').val();
  const password = $('#login-password').val();

  // ログインを試みる
  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then(() => {
      // ログインに成功したときの処理
      console.log('ログインしました。');

      // ログインフォームを初期状態に戻す
      resetLoginForm();
    })
    .catch((error) => {
      // ログインに失敗したときの処理
      console.error('ログインエラー', error);

      $('#login__help')
        .text('ログインに失敗しました。')
        .show();

      // ログインボタンを元に戻す
      $loginButton.text('ログイン');
    });
});

// ログアウトボタンが押されたらログアウトする
$('.logout-button').on('click', () => {
  firebase
    .auth()
    .signOut()
    .catch((error) => {
      console.error('ログアウトに失敗:', error);
    });
});

/**
 * -------------------
 * 書籍一覧画面関連の関数
 * -------------------
 */
 
 // レシピの画像をダウンロードする
 const downloadRecipeImage = manualImageLocation => firebase
  .storage()
  .ref(manualImageLocation)
  .getDownloadURL()
  .catch((error) => {
    console.error('写真のダウンロードに失敗：', error);
  });
  
// レシピの画像を表示する
const displayRecipeImage = ($divTag, url) => {
  $divTag.find('.recipe-item__image').attr({
    src:url,
  });
};

// Baito の Database の manuals からレシピを削除する
const deleteManual = (manualId) => {
  if(window.confirm('削除してよろしいですか？')){
    return firebase
      .database()
      .ref(`manuals/${manualId}`)
      .remove();
    // キャンセル時の処理
　} else {
　　return;
　}
};

// レシピの表示用のdivを作って返す
const createManualDiv = (manualId, manualData) => {
  // HTML内のテンプレートからコピーを作成する
  const $divTag = $('#manual-template > .manual-item').clone(true);
  
  // レシピタイトルを表示する
  $divTag.find('.recipe-title').text(manualData.manualTitle);
  
  // 材料を表示する
  $divTag.find('.material-content').text(manualData.manualMaterial);
  
  // 作り方を表示する
  $divTag.find('.recipe_text').text(manualData.manualContent);
  
  // レシピの表示画像をダウンロードして表示する
  downloadRecipeImage(manualData.manualImageLocation).then((url) => {
    displayRecipeImage($divTag, url);
  });
  
  // id属性をセット
  $divTag.attr('id', `manual-id-${manualId}`);
  
  // 削除ボタンのイベントハンドラを登録
  const $deleteButton = $divTag.find('.manual-item__delete');
  $deleteButton.on('click', () => {
    deleteManual(manualId);
  });
  return $divTag;
};

// レシピ一覧画面内のレシピデータをクリア
const resetRecipelist = () => {
  $('#manual-list').empty();
};

// レシピ一覧画面にレシピデータを表示する
const addRecipe = (manualId, manualData) => {
  const $divTag = createManualDiv(manualId, manualData);
  $divTag.appendTo('#manual-list');
  
  if (manualData.manualcategory === "ストーブ") {
    $divTag.appendTo('#stove-list');
  } else if (manualData.manualcategory === "揚げ場") {
    $divTag.appendTo('#fry-list');
  } else if (manualData.manualcategory === "焼き場") {
    $divTag.appendTo('#bake-list');
  } else if (manualData.manualcategory === "刺し場") {
    $divTag.appendTo('#sashi-list');
  } else if (manualData.manualcategory === "サラダ場") {
    $divTag.appendTo('#salad-list');
  } else {
    $divTag.appendTo('#shikomi-list');
  }
};




// レシピ一覧画面の初期化、イベントハンドラ登録処理
const loadManualListView = () => {
  resetRecipelist();
  
  // レシピデータを取得
  const manualsRef = firebase
    .database()
    .ref('manuals')
    .orderByChild('createdAt');
    
  // 過去に登録したイベントハンドラを削除
  manualsRef.off('child_removed');
  manualsRef.off('child_added');
  
  // manuals の child_removedイベントハンドラを登録
  // (データベースから書籍が削除されたときの処理)
  manualsRef.on('child_removed', (manualSnapshot) => {
    const manualId = manualSnapshot.key;
    const $manual = $(`#manual-id-${manualId}`);
    
    $manual.remove();
  });
  
  // manuals の child_addedイベントハンドラを登録
  // (データベースにレシピが追加保存されたときの処理)
  manualsRef.on('child_added', (manualSnapshot) => {
    const manualId = manualSnapshot.key;
    const manualData = manualSnapshot.val();
    
    addRecipe(manualId, manualData);
  });
};

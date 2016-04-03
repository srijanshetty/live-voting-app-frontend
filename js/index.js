REST_URL = "http://128.199.251.96:5000/"

function render(tmpl_name, tmpl_data = {}) {
    if ( !render.tmpl_cache ) {
        render.tmpl_cache = {};
    }

    if ( !render.tmpl_cache[tmpl_name] ) {
        var tmpl_dir = 'static/templates';
        var tmpl_url = tmpl_dir + '/' + tmpl_name + '.html';

        var tmpl_string;
        $.ajax({
            url: tmpl_url,
            method: 'GET',
            async: false,
            dataType: 'html',
            success: function(data) {
                tmpl_string = data;
            }
        });

        render.tmpl_cache[tmpl_name] = _.template(tmpl_string);
    }

    return render.tmpl_cache[tmpl_name](tmpl_data);
}

function addView(elem_ident, template_name, template_data) {
  $(elem_ident).html(render(template_name, template_data));
  $.cookie("current_view", template_name);
  $.cookie(template_name, JSON.stringify(template_data));
  window.current_object = template_data
  window.location.hash = "#" + template_name
}

function addHome(template_name, data = {}) {
  addView("#logged-in", template_name, data);
}

$(window).on('hashchange', function() {
  curr = window.location.hash.substring(1)
  if (curr.length == 0)
    return
  saved = $.cookie("current_view")
  if (curr != saved)
    addHome(curr, JSON.parse($.cookie(curr)));
});

$(document).ready(function() {
  window.location.hash = "";
  window.persistent_object = {};
  // Errors
  window.setInterval(function() {
    if ($(".to-fade").is(":visible")) {
      window.setTimeout(function() {
        $(".to-fade").fadeOut();
      }, 1000);
    }
    if ($(".to-fade-slower").is(":visible")) {
      window.setTimeout(function() {
        $(".to-fade-slower").fadeOut();
      }, 5000);
    }
    if($(".question").length){
      qid = $(".question").attr('data-id');
      get_question(qid, "logged-in", "question")
    }
  }, 500)
});


//-- EVENTS --//

$(document).on('profile_loaded', function() {
  if (window.profile !== null) {
    $("#logged-in").show()
    addView("#logged-in", "index", {})
    $("#login").hide()
    $(".success").html("Login Successful!")
    $(".success-parent").show()
  }
  else {
    $("#login").show()
    $(".errors").html("Unable to Login")
    $(".errors-parent").show()
    $("#logged-in").hide()
  }
})

$(document).on( 'click', "#login-button", function(e) {
  e.preventDefault();
  check_login()
});

$(document).on('click',"#save-question", function(e) {
  e.preventDefault();
  question = $("#question").val()
  options = _.map($(".q-option"), function(el) {
    return $(el).val()
  })
  options = _.filter(options, function(el) {
    if (el.length > 0) return true
    return false
  })

  new_question(question, options)
  $(document).on('question_saved', function (e, data) {
    curr_key = data["key"]

    if (window.persistent_object["qid"] && window.persistent_object["qid"] !== curr_key){
      update_next_qid(window.persistent_object["qid"], data["key"])
      curr_key = window.persistent_object["qid"]
    }

    $(".success").html("Question Saved! Please share this key: " + curr_key)
    $(".success-parent-longer").show()

    window.persistent_object["qid"] = data["key"]
    $(".show-next-question-container").show()
  })
})

$(document).on('click', '.q-vote', function(e) {
  e.preventDefault()
  option = $(e.currentTarget).attr('data-option')
  qid = $(e.currentTarget).attr('data-qid')

  vote(qid, option)

  $(document).on('vote_done', function() {
    addHome("index", {})
    $(".success").html("Vote Cast!")
    $(".success-parent").show()
  })
})

function vote_question()
{
  qid = $("#view-question").val()
  get_question(qid, "#logged-in", "vote")
}

$(document).on('click', '.show-next-question', function() {
  addHome('create')
})

//-- REST Queries --//

function check_login() {
  $.ajax({
    url: REST_URL + "users",
    method: "POST",
    data: {
      email: $("#login-email").val()
    },
    dataType: "json",
    success: function(data) {
      window.profile = data;
      window.profile.email = $("#login-email").val()
    }
  }).fail(function() {
    window.profile = null;

    $(".errors").html("Unable to Login")
    $(".errors-parent").show()
  }).always(function() {
    $(document).trigger("profile_loaded");
  });
}

function get_questions(ident, template_name)
{
  $.ajax({
    url: REST_URL + "questions",
    method: "GET",
    dataType: "json",
    headers: {
      "X-Access-Key": window.profile.key
    },
    success: function(data) {
      addView(ident, template_name, {list: data})
    }
  }).fail(function() {
    $(".errors").html("Unable to fetch questions.")
    $(".errors-parent").show()
  }).always(function() {
  });
}

function get_question(qid, ident, template_name)
{
  $.ajax({
    url: REST_URL + "questions/" + qid,
    method: "GET",
    dataType: "json",
    headers: {
      "X-Access-Key": window.profile.key
    },
    success: function(data) {
      addView(ident, template_name, data)
    }
  }).fail(function() {
    $(".errors").html("No question with this UID")
    $(".errors-parent").show()
  }).always(function() {
  });
}

function update_next_qid(old_qid, new_qid)
{
  $.ajax({
    url: REST_URL + "questions/" + old_qid,
    method: "PUT",
    dataType: "json",
    data: {
      "next_qid": new_qid
    },
    headers: {
      "X-Access-Key": window.profile.key
    },
    success: function(data) {
      console.log(old_qid + "," + new_qid)
    }
  }).fail(function() {
    $(".errors").html("No question with this UID")
    $(".errors-parent").show()
  }).always(function() {
  });
}

function new_question(question, options)
{
  $.ajax({
    url: REST_URL + "questions",
    method: "POST",
    dataType: "json",
    data: {
      question: question,
      options: options
    },
    headers: {
      "X-Access-Key": window.profile.key
    },
    success: function(data) {
      $(document).trigger('question_saved', data)
    }
  }).fail(function() {
    $(".errors").html("Unable to save question.")
    $(".errors-parent").show()
  }).always(function() {
  });
}

function vote(qid, option)
{
  $.ajax({
    url: REST_URL + "vote/" + qid,
    method: "POST",
    dataType: "json",
    data: {
      "qid": qid,
      "option": option
    },
    headers: {
      "X-Access-Key": window.profile.key
    },
    success: function(data) {
      $(document).trigger('vote_done')
    }
  }).fail(function() {
    $(".errors").html("Unable to cast vote.")
    $(".errors-parent").show()
  }).always(function() {
  });
}

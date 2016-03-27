REST_URL = "http://128.199.251.96:5000/"

function render(tmpl_name, tmpl_data = {}) {
    if ( !render.tmpl_cache ) {
        render.tmpl_cache = {};
    }

    if ( !render.tmpl_cache[tmpl_name] ) {
        var tmpl_dir = '/static/templates';
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
}

function addHome(template_name, data = {}) {
  addView("#logged-in", template_name, data);
}

$(document).on('click', ".go-trigger", function(e) {
  e.preventDefault();
  url = $(e.currentTarget).attr('go-template');
  data = $(e.currentTarget).attr('go-data');
  addHome(url, data);
});

$(document).ready(function() {
  // Errors
  window.setInterval(function() {
    if ($(".to-fade").is(":visible")) {
      window.setTimeout(function() {
        $(".to-fade").fadeOut();
      }, 1000);
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
  $(document).on('question_saved', function () {
    $(".success").html("Question Saved!")
    $(".success-parent").show()
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
    }
  }).fail(function() {
    window.profile = null;

    //window.profile = {key: "123"};

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

    /*
    data = [
      {
        id: 1, question: "hello"
      },
      {
        id: 2, question: "world"
      }
    ]

    addView(ident, template_name, {list: data})
    */
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

    /*
    data = {
      id: 1, question: "hello",
      options: ["asdf", "qwer"],
      stats: [1,2]
    }

    addView(ident, template_name, data)
    */
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
      $(document).trigger('question_saved')
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
      "option": option,
      "email": profile.email
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
    //$(document).trigger('vote_done')
  }).always(function() {
  });
}
migrate(
  (app) => {
    // Migration limpa e noop para resolver a fila pendente de retry 1774000038
    console.log('1774000038_test_simple: noop placeholder resolved')
  },
  (app) => {
    // down
  },
)

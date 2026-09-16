import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { History, Clock, User, ArrowRight } from 'lucide-react'
import { TestProgrammingLogRecord } from '@/types/test-programming'
import { testProgrammingService } from '@/services/test-programming-service'

interface TestHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  testProgrammingId: string
  testId: string
  title: string
}

export const TestHistoryModal: React.FC<TestHistoryModalProps> = ({
  isOpen,
  onClose,
  testProgrammingId,
  testId,
  title,
}) => {
  const [logs, setLogs] = useState<TestProgrammingLogRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && testProgrammingId) {
      setLoading(true)
      testProgrammingService
        .getLogs(testProgrammingId)
        .then(setLogs)
        .finally(() => setLoading(false))
    }
  }, [isOpen, testProgrammingId])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <History className="w-5 h-5 text-[#004C97]" />
              <span>Trilha de Auditoria & Histórico de Alterações</span>
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {testId}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 truncate">{title}</p>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Carregando histórico do backend...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhum evento registrado ainda para este teste.
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-4 space-y-4">
              {logs.map((log, idx) => (
                <div key={log.id || idx} className="relative pl-6">
                  {/* Ponto na timeline */}
                  <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-[#004C97] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#004C97]" />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="font-semibold text-[11px] bg-blue-100 text-[#004C97]"
                        >
                          {log.action}
                        </Badge>
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock className="w-3 h-3" />
                          {log.date} às {log.time}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 font-medium text-slate-700 text-[11px]">
                        <User className="w-3 h-3 text-slate-400" />
                        {log.user_name}
                      </span>
                    </div>

                    {(log.previous_value || log.new_value) && (
                      <div className="flex items-center gap-2 font-mono text-[11px] bg-white p-1.5 rounded border border-slate-100">
                        <span className="text-slate-400 line-through">
                          {log.previous_value || '(vazio)'}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">
                          {log.new_value || '(vazio)'}
                        </span>
                      </div>
                    )}

                    {log.reason && (
                      <div className="text-slate-600 italic bg-amber-50/50 p-1.5 rounded border border-amber-100/60">
                        "{log.reason}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
